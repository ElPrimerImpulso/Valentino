/**
 * firebase-manager.js: Gestor de Base de Datos
 * (Versión BLINDADA: Verifica la nube antes de sobrescribir)
 */

const {
  initializeApp,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  firebaseConfig,
} = window.firebaseSDK;

// --- ID MAESTRO: SIEMPRE 'valentino' ---
const PROGRESS_DOC_ID = "valentino";

let app;
let auth;
let db;
let currentUserId = null;
let currentMaxStep = 0; // Referencia local, pero NO es la autoridad final

const init = () => {
  console.log("[Firebase] Inicializando Manager...");
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Ignoramos el user.uid real y usamos siempre el ID maestro
        currentUserId = user.uid;
        console.log(
          `[Firebase] Conectado. Usando ID Maestro: "${PROGRESS_DOC_ID}"`
        );
        resolve();
      } else {
        signInAnonymously(auth)
          .then((cred) => {
            currentUserId = cred.user.uid;
            resolve();
          })
          .catch(reject);
      }
    });
  });
};

const subscribeToProgress = (callback) => {
  if (!db) return;
  const docRef = doc(db, "progress", PROGRESS_DOC_ID);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Si la nube tiene un paso mayor, actualizamos nuestra variable local
      if (data.maxStep !== undefined && data.maxStep > currentMaxStep) {
        currentMaxStep = data.maxStep;
      }
      callback(data);
    } else {
      // Detección de Hard Reset (Borrado desde Admin)
      console.warn("[Firebase] Reset remoto detectado.");
      localStorage.removeItem("navidad_progress");
      window.location.reload();
    }
  });
};

const loadProgress = async () => {
  const docRef = doc(db, "progress", PROGRESS_DOC_ID);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      currentMaxStep = data.maxStep || 0;
      return data;
    }
    return { maxStep: 0, lastSection: "intro" };
  } catch (error) {
    console.error("[Firebase] Error carga:", error);
    return { maxStep: 0, lastSection: "intro" };
  }
};

/**
 * --- CORRECCIÓN CRÍTICA: GUARDADO SEGURO ---
 * Ya no confiamos en la variable local.
 * Leemos la nube ANTES de escribir.
 */
const saveProgress = async (newStep, sectionId) => {
  if (!currentUserId) return;

  // Referencia al documento 'valentino'
  const docRef = doc(db, "progress", PROGRESS_DOC_ID);

  try {
    // 1. CONSULTAR LA VERDAD EN LA NUBE
    // (Esto evita que una recarga con variable en 0 sobrescriba el progreso real)
    const cloudSnap = await getDoc(docRef);
    let cloudMaxStep = 0;

    if (cloudSnap.exists()) {
      cloudMaxStep = cloudSnap.data().maxStep || 0;
    }

    // 2. COMPARAR
    // Solo guardamos si nuestro nuevo paso es MAYOR al de la nube.
    if (newStep > cloudMaxStep) {
      console.log(
        `[Firebase] Guardando nuevo récord: ${cloudMaxStep} -> ${newStep}`
      );
      currentMaxStep = newStep; // Actualizamos local

      await setDoc(
        docRef,
        {
          maxStep: newStep,
          lastSection: sectionId,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      console.log(
        `[Firebase] 🛡️ Guardado bloqueado. Nube (${cloudMaxStep}) >= Nuevo (${newStep}). No se toca nada.`
      );
    }
  } catch (error) {
    console.error("[Firebase] Error saveProgress:", error);
  }
};

const updateCurrentLocation = async (sectionId) => {
  if (!currentUserId) return;
  const docRef = doc(db, "progress", PROGRESS_DOC_ID);
  try {
    // Solo actualizamos la ubicación ("dónde está mirando"), SIN tocar maxStep
    await setDoc(
      docRef,
      {
        currentSection: sectionId,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error(error);
  }
};

const saveRiddleAttempt = async (riddleId, attempt, isCorrect) => {
  if (!currentUserId) return;
  try {
    const colRef = collection(db, "progress", PROGRESS_DOC_ID, "attempts");
    await addDoc(colRef, {
      riddleId,
      attempt,
      isCorrect,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
  }
};

export default {
  init,
  loadProgress,
  saveProgress, // <-- Ahora incluye la protección remota
  updateCurrentLocation,
  saveRiddleAttempt,
  subscribeToProgress,
};
