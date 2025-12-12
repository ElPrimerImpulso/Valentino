/**
 * admin.js: Controlador del Panel de Admin
 * (Versión Final: Detecta el camino activo para no mezclar progresos)
 */

import config from "./config.js";

// 1. OBTENER DEPENDENCIAS
const {
  initializeApp,
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
  firebaseConfig,
} = window.firebaseAdminSDK;

// Variables Globales
let app, db, auth;
const PROGRESS_DOC_ID = "valentino";

// Elementos DOM
const visualPathEl = document.getElementById("visual-path");
const detailsCardsEl = document.getElementById("details-cards");
const attemptsListEl = document.getElementById("attempts-list");
const systemStatusEl = document.getElementById("system-status");

// Listas de Secciones por Rama (Para filtrar visualmente)
const BRANCHES = {
  common: ["intro", "decision"],
  fast: ["confirmacion1", "confirmacion2", "final2"],
  patient: [
    "acertijo1",
    "explicacion1",
    "acertijo2",
    "explicacion2",
    "acertijo3",
    "explicacion3",
    "pausa",
    "final",
    "countdown",
  ],
};

// =======================================================
// 1. UTILIDADES
// =======================================================

const createStepElement = (sectionId, currentSection, visitedPath) => {
  const sectionData = config.sections[sectionId];
  if (!sectionData) return document.createElement("div");

  const el = document.createElement("div");
  el.className = "path-step";

  // Lógica de clases visuales
  if (sectionId === currentSection) {
    el.classList.add("current");
  } else if (visitedPath.has(sectionId)) {
    el.classList.add("visited");
  } else {
    el.classList.add("locked");
  }

  el.innerHTML = `
    <strong>${sectionData.title || sectionId.toUpperCase()}</strong>
    <div class="path-timestamp">Paso ${sectionData.step}</div>
  `;
  return el;
};

// =======================================================
// 2. RENDERIZADO (LÓGICA MEJORADA)
// =======================================================

const renderVisualPath = (currentSection, maxStep) => {
  if (!visualPathEl) return;
  visualPathEl.innerHTML = "";

  // 1. DETECTAR RAMA ACTIVA
  // Averiguamos en qué camino está el usuario basándonos en su sección actual
  let activeBranch = "common"; // Por defecto
  if (BRANCHES.fast.includes(currentSection)) activeBranch = "fast";
  if (BRANCHES.patient.includes(currentSection)) activeBranch = "patient";

  const visitedPath = new Set();

  Object.keys(config.sections).forEach((k) => {
    // Regla base: El paso debe ser menor o igual al máximo alcanzado
    if (config.sections[k].step <= maxStep) {
      // REGLA DE FILTRADO INTELIGENTE:
      // Si el usuario está en el camino "Paciente", NO marcamos los pasos del "Rápido"
      // y viceversa. Los pasos comunes ("intro", "decision") siempre se marcan.

      const isCommon = BRANCHES.common.includes(k);
      const isFast = BRANCHES.fast.includes(k);
      const isPatient = BRANCHES.patient.includes(k);

      if (activeBranch === "patient" && isFast) return; // Ignorar Rápido si estamos en Paciente
      if (activeBranch === "fast" && isPatient) return; // Ignorar Paciente si estamos en Rápido

      // Si pasamos el filtro, lo añadimos
      visitedPath.add(k);
    }
  });

  const addBranch = (title, ids) => {
    const d = document.createElement("div");
    d.className = "path-branch";
    d.innerHTML = `<div class="path-branch-title">${title}</div>`;
    ids.forEach((id) =>
      d.appendChild(createStepElement(id, currentSection, visitedPath))
    );
    visualPathEl.appendChild(d);
  };

  // Definición de ramas visuales
  addBranch("Inicio", BRANCHES.common);
  addBranch("Rápido", BRANCHES.fast);
  addBranch("Paciente", BRANCHES.patient);
};

const renderControls = (userData) => {
  if (!detailsCardsEl) return;

  const current = userData.currentSection || "---";
  const max =
    userData.maxStep !== undefined ? `Paso ${userData.maxStep}` : "---";

  detailsCardsEl.innerHTML = `
    <div class="detail-card"><p>Ubicación Actual</p><strong class="highlight">${current.toUpperCase()}</strong></div>
    <div class="detail-card"><p>Progreso Máximo</p><strong>${max}</strong></div>
    
    <div class="admin-divider"></div>
    
    <div style="margin-top:1rem; display:grid; grid-template-columns: 1fr 1fr; gap:10px">
        <button id="btn-unlock" class="admin-button-google" style="width:100%">🔓 Desbloquear Final</button>
        <button id="btn-clear-history" class="admin-button-delete" style="border-color:var(--admin-warning); color:var(--admin-warning);">🧹 Limpiar Logs</button>
    </div>
    
    <div style="margin-top:1rem;">
        <button id="btn-reset" class="admin-button-delete" style="width:100%">💀 RESET TOTAL</button>
    </div>
  `;

  document.getElementById("btn-unlock").onclick = handleUnlockPausa;
  document.getElementById("btn-clear-history").onclick = handleClearHistory;
  document.getElementById("btn-reset").onclick = handleHardReset;
};

// =======================================================
// 3. HANDLERS
// =======================================================

const handleUnlockPausa = async () => {
  const btn = document.getElementById("btn-unlock");
  const originalText = btn.textContent;
  btn.textContent = "Enviando...";
  btn.disabled = true;

  try {
    await setDoc(
      doc(db, "progress", PROGRESS_DOC_ID),
      { pausaUnlocked: true },
      { merge: true }
    );
    alert("✅ Señal enviada. El usuario verá el botón de continuar.");
  } catch (e) {
    alert("Error: " + e.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

const handleClearHistory = async () => {
  if (!confirm("¿Limpiar solo el historial de intentos?")) return;
  try {
    const attemptsRef = collection(db, "progress", PROGRESS_DOC_ID, "attempts");
    const snapshot = await getDocs(attemptsRef);
    const promises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(promises);
    alert("✅ Logs limpiados.");
  } catch (e) {
    alert("Error: " + e.message);
  }
};

const handleHardReset = async () => {
  if (
    !confirm(
      "⚠️ ¿RESET TOTAL?\nSe borrará todo el progreso y Valentino volverá al inicio."
    )
  )
    return;

  const btn = document.getElementById("btn-reset");
  if (btn) {
    btn.textContent = "Borrando...";
    btn.disabled = true;
  }

  try {
    try {
      const attemptsRef = collection(
        db,
        "progress",
        PROGRESS_DOC_ID,
        "attempts"
      );
      const snapshot = await getDocs(attemptsRef);
      await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
    } catch (e) {
      console.warn("Error historial:", e);
    }

    await deleteDoc(doc(db, "progress", PROGRESS_DOC_ID));
    alert("✅ Reinicio completado.");
  } catch (e) {
    alert("Error crítico: " + e.message);
  } finally {
    if (btn) {
      btn.textContent = "💀 RESET TOTAL";
      btn.disabled = false;
    }
  }
};

// =======================================================
// 4. INICIALIZACIÓN
// =======================================================

const init = () => {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (systemStatusEl) {
        systemStatusEl.textContent = "Conectado";
        systemStatusEl.className = "status-badge success";
      }
      startListening();
    } else {
      signInAnonymously(auth).catch((e) => {
        if (systemStatusEl) {
          systemStatusEl.textContent = "Error Auth";
          systemStatusEl.className = "status-badge warning";
        }
        console.error("Auth Error:", e);
      });
    }
  });
};

const startListening = () => {
  onSnapshot(doc(db, "progress", PROGRESS_DOC_ID), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      renderVisualPath(data.currentSection, data.maxStep);
      renderControls(data);
    } else {
      renderVisualPath("intro", 0);
      renderControls({ currentSection: "intro", maxStep: 0 });
    }
  });

  const q = query(
    collection(db, "progress", PROGRESS_DOC_ID, "attempts"),
    orderBy("timestamp", "desc"),
    limit(20)
  );

  onSnapshot(q, (snap) => {
    if (!attemptsListEl) return;
    attemptsListEl.innerHTML = "";
    if (snap.empty) {
      attemptsListEl.innerHTML =
        "<li style='padding:1rem; color:#666;'>Sin actividad reciente</li>";
      return;
    }
    snap.forEach((d) => {
      const v = d.data();
      const li = document.createElement("li");
      li.className = v.isCorrect ? "attempt-correct" : "attempt-incorrect";
      const time = v.timestamp
        ? new Date(v.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      li.innerHTML = `<span>${v.riddleId}: <strong>${v.attempt}</strong></span><span style="opacity:0.5; font-size:0.8em">${time}</span>`;
      attemptsListEl.appendChild(li);
    });
  });
};

init();
