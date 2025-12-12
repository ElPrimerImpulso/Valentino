/**
 * firebase-manager.js: Módulo para manejar Firebase (App del Cliente)
 * (Versión Final: Incluye detección de Hard Reset)
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

const PROGRESS_DOC_ID = "valentino";

let app;
let auth;
let db;
let currentUserId = null;
let currentMaxStep = 0;

const init = () => {
  console.log("[Firebase] Inicializando...");
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUserId = user.uid;
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

/**
 * Suscribe a cambios en tiempo real.
 * Permite teletransporte y detección de reinicio remoto.
 */
const subscribeToProgress = (callback) => {
  if (!db) return;
  const docRef = doc(db, "progress", PROGRESS_DOC_ID);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.maxStep !== undefined) {
        currentMaxStep = data.maxStep;
      }
      callback(data);
    } else {
      // --- DETECCIÓN DE HARD RESET ---
      // El documento no existe, lo cual significa que el admin lo borró.
      console.warn(
        "[Firebase] Reset remoto detectado. Reiniciando experiencia..."
      );
      localStorage.removeItem("navidad_progress"); // Borrar caché local
      window.location.reload(); // Recargar para volver a la Intro
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

const saveProgress = async (newStep, sectionId) => {
  if (!currentUserId) return;
  if (newStep <= currentMaxStep) return;

  currentMaxStep = newStep;
  const docRef = doc(db, "progress", PROGRESS_DOC_ID);

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
    console.error(error);
  }
};

const updateCurrentLocation = async (sectionId) => {
  if (!currentUserId) return;
  const docRef = doc(db, "progress", PROGRESS_DOC_ID);
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
  saveProgress,
  updateCurrentLocation,
  saveRiddleAttempt,
  subscribeToProgress,
};
