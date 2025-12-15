/**
 * firebase-manager.js: Gestor de Base de Datos
 * (Versión: DOCUMENTO ÚNICO "valentino")
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

// --- CLAVE: Este es el ID ÚNICO para todos los dispositivos ---
const PROGRESS_DOC_ID = "valentino";
// -------------------------------------------------------------

let app;
let auth;
let db;
let currentMaxStep = 0;

const init = () => {
  console.log("[Firebase] Inicializando...");
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Usuario conectado (ID técnico):", user.uid);
        // Aunque tenga un ID técnico único, usaremos 'valentino' para los datos
        resolve();
      } else {
        signInAnonymously(auth)
          .then(() => resolve())
          .catch((error) => {
            console.error("Error Auth:", error);
            reject(error);
          });
      }
    });
  });
};

/**
 * Cargar progreso siempre del documento 'valentino'
 */
const loadProgress = async () => {
  const docRef = doc(db, "progress", PROGRESS_DOC_ID); // <--- SIEMPRE 'valentino'
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      currentMaxStep = data.maxStep || 0;
      return data;
    }
    // Si no existe, creamos el perfil inicial
    return { maxStep: 0, lastSection: "intro", pausaUnlocked: false };
  } catch (error) {
    console.error("[Firebase] Error carga:", error);
    return { maxStep: 0, lastSection: "intro" };
  }
};

/**
 * Guardar progreso en 'valentino'
 */
const saveProgress = async (newStep, sectionId) => {
  // Protección local: no bajar de nivel
  if (newStep <= currentMaxStep) return;
  currentMaxStep = newStep;

  const docRef = doc(db, "progress", PROGRESS_DOC_ID); // <--- SIEMPRE 'valentino'

  try {
    await setDoc(
      docRef,
      {
        maxStep: newStep,
        lastSection: sectionId,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error guardando progreso:", error);
  }
};

/**
 * Actualizar ubicación actual (para que el Admin lo vea)
 */
const updateCurrentLocation = async (sectionId) => {
  const docRef = doc(db, "progress", PROGRESS_DOC_ID); // <--- SIEMPRE 'valentino'
  try {
    await setDoc(
      docRef,
      {
        currentSection: sectionId,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error ubicación:", error);
  }
};

/**
 * Guardar intentos de acertijos en la subcolección de 'valentino'
 */
const saveRiddleAttempt = async (riddleId, attempt, isCorrect) => {
  try {
    // Guardamos en: progress/valentino/attempts
    const colRef = collection(db, "progress", PROGRESS_DOC_ID, "attempts");
    await addDoc(colRef, {
      riddleId,
      attempt,
      isCorrect,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error guardando intento:", error);
  }
};

/**
 * Escuchar cambios en 'valentino' (Teletransporte)
 */
const subscribeToProgress = (callback) => {
  if (!db) return;
  const docRef = doc(db, "progress", PROGRESS_DOC_ID); // <--- SIEMPRE 'valentino'

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.maxStep !== undefined) {
        currentMaxStep = data.maxStep;
      }
      callback(data);
    }
  });
};

export default {
  init,
  loadProgress,
  saveProgress,
  updateCurrentLocation,
  saveRiddleAttempt,
  subscribeToProgress,
};
