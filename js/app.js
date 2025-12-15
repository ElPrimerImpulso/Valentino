import config from "./config.js";
import Router from "./router.js";
import Render from "./render.js";
import AudioManager from "./audio-manager.js";
import Countdown from "./countdown.js";
import Preloader from "./preloader.js";
import FirebaseManager from "./firebase-manager.js";

/**
 * app.js: El Orquestador
 * (Versión MAESTRA: Sincronización + Fondos JS + Audio Instantáneo)
 */
const App = {
  _isAudioStarted: false,
  _currentSection: null,
  _activeBGMType: null,
  _userMaxStep: 0,
  _isFirebaseConnected: false,
  _videoElementForPausa: null,
  _pausaCheckInterval: null,
  _isRemoteUnlockEnabled: false,

  async init() {
    console.log("[App.js] Iniciando sistema...");
    AudioManager.init({ onNarrationEnd: this._handleNarrationEnd.bind(this) });

    Render.init(document.getElementById("app-root"), {
      onNavigate: (id) => Router.navigate(id),
      onIntroPlay: this._handleIntroPlay.bind(this),
      onNavigateWithSkip: (id) => Router.navigate(id),
      onAudioUnlocked: this._handleAudioUnlock.bind(this),
      onPausaNext: this._handlePausaNext.bind(this),
    });

    // 1. CARGAR PROGRESO LOCAL (LocalStorage)
    // Esto asegura que si recarga sin internet, no pierda su lugar.
    const localData = JSON.parse(localStorage.getItem("navidad_progress"));
    let startStep = 0;
    let startSection = "intro";

    if (localData) {
      console.log("[App.js] Progreso local detectado:", localData);
      startStep = localData.maxStep || 0;
      if (config.stepToSectionMap[startStep]) {
        startSection = config.stepToSectionMap[startStep];
      }
    }

    // 2. CONECTAR Y SINCRONIZAR CON LA NUBE (Firebase)
    try {
      await FirebaseManager.init();
      this._isFirebaseConnected = true;
      console.log("[App.js] Conectado a Firebase.");

      // Leemos la nube para ver si hay un progreso más avanzado (ej: jugó en PC)
      const cloudData = await FirebaseManager.loadProgress();
      const cloudStep = cloudData.maxStep || 0;

      // --- LÓGICA DE FUSIÓN (Sincronización) ---
      if (cloudStep > startStep) {
        console.log(
          `[App.js] Nube gana (${cloudStep} > ${startStep}). Sincronizando...`
        );
        this._userMaxStep = cloudStep;
        startSection =
          cloudData.lastSection ||
          config.stepToSectionMap[cloudStep] ||
          "intro";
        // Guardamos en local para estar al día
        localStorage.setItem(
          "navidad_progress",
          JSON.stringify({ maxStep: this._userMaxStep })
        );
      } else if (startStep > cloudStep) {
        console.log(
          `[App.js] Local gana (${startStep} > ${cloudStep}). Subiendo a nube...`
        );
        this._userMaxStep = startStep;
        // Subimos el progreso local a la nube
        FirebaseManager.saveProgress(this._userMaxStep, startSection);
      } else {
        console.log("[App.js] Sincronizados.");
        this._userMaxStep = startStep;
      }

      if (cloudData.pausaUnlocked) this._isRemoteUnlockEnabled = true;

      // Reportar "Estoy aquí" inmediatamente (para que lo veas en Admin)
      FirebaseManager.updateCurrentLocation(startSection);

      // Activar escucha de "Teletransporte"
      FirebaseManager.subscribeToProgress((data) =>
        this._handleRemoteUpdate(data)
      );
    } catch (error) {
      console.warn("[App.js] Modo Offline / Error:", error);
      this._userMaxStep = startStep;
    }

    // 3. INICIAR NAVEGACIÓN
    Router.init((sectionId) => this.showSection(sectionId));

    // Manejo inteligente de la URL
    if (!window.location.hash) {
      Router.navigate(startSection);
    } else {
      const initialHash = window.location.hash.replace("#", "");
      this.showSection(initialHash);
    }

    this._preloadCriticalAssets();
  },

  _handleRemoteUpdate(data) {
    // Si la nube actualiza el paso máximo, lo tomamos
    if (data.maxStep !== undefined && data.maxStep > this._userMaxStep) {
      this._userMaxStep = data.maxStep;
      localStorage.setItem(
        "navidad_progress",
        JSON.stringify({ maxStep: this._userMaxStep })
      );
    }
    // Teletransporte forzado
    if (data.currentSection && data.currentSection !== this._currentSection) {
      Router.navigate(data.currentSection);
    }
    // Desbloqueo remoto de pausa
    if (data.pausaUnlocked === true) {
      this._isRemoteUnlockEnabled = true;
      if (this._currentSection === "pausa") this._showPausaButton();
    }
  },

  async showSection(sectionId) {
    const sectionData = config.sections[sectionId];
    if (!sectionData) {
      Router.navigate("intro", true);
      return;
    }

    // Protección Anti-Salto (Hack de URL)
    if (sectionData.step > this._userMaxStep + 1) {
      const safeSection = config.stepToSectionMap[this._userMaxStep] || "intro";
      Router.navigate(safeSection, true);
      return;
    }

    if (this._currentSection) await this._fadeOut();

    this._currentSection = sectionId;

    // --- IMPORTANTE: FONDOS POR JS (Para evitar error de rutas CSS) ---
    if (sectionData.background) {
      document.body.style.backgroundImage = `url('${sectionData.background}')`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
    } else {
      document.body.style.backgroundImage = "none";
      document.body.style.backgroundColor = "#000";
    }

    // Clases CSS opcionales
    document.body.className = `view-${sectionId}`;

    if (this._isFirebaseConnected)
      FirebaseManager.updateCurrentLocation(sectionId);

    // Guardar progreso si avanzamos
    if (sectionData.step > this._userMaxStep) {
      this._userMaxStep = sectionData.step;
      localStorage.setItem(
        "navidad_progress",
        JSON.stringify({ maxStep: sectionData.step })
      );
      if (this._isFirebaseConnected)
        FirebaseManager.saveProgress(sectionData.step, sectionId);
    }

    AudioManager.stopNarration();
    if (sectionId !== "countdown") Countdown.stop();

    Render.section(sectionId);

    // --- LÓGICA DE AUDIO INSTANTÁNEO ---
    // Si el audio no está iniciado (ej: F5) mostramos botón de reanudar
    if (
      !this._isAudioStarted &&
      sectionId !== "intro" &&
      sectionId !== "countdown"
    ) {
      Render.showResumeOverlay(() => {
        console.log("[App.js] Audio reactivado (Click).");
        this._isAudioStarted = true;
        // Pasamos true para decir "ES UN RESUME, suena YA"
        this._executeAudioLogic(sectionId, sectionData, true);
      });
    } else {
      // Flujo normal
      this._executeAudioLogic(sectionId, sectionData, false);
    }

    // Lógica Pausa
    if (sectionId === "pausa") {
      this._checkPausaUnlock();
      if (!this._isRemoteUnlockEnabled) {
        this._pausaCheckInterval = setInterval(
          () => this._checkPausaUnlock(),
          30000
        );
      }
    } else if (this._pausaCheckInterval) {
      clearInterval(this._pausaCheckInterval);
      this._pausaCheckInterval = null;
    }

    await this._fadeIn();
    this._preloadNextSections(sectionId);
  },

  _executeAudioLogic(sectionId, sectionData, isResume) {
    let bgmType = "main";
    if (sectionId === "countdown") bgmType = "final";
    else if (sectionId === "final") bgmType = "none";
    else if (sectionData.type === "intro") bgmType = "none";

    // 1. Música de Fondo
    if (this._isAudioStarted && bgmType !== this._activeBGMType) {
      if (bgmType === "main") AudioManager.playBGM();
      else if (bgmType === "final") AudioManager.playBGMFinal();
      else AudioManager.stopAllBGM();
      this._activeBGMType = bgmType;
    } else if (sectionId === "countdown") {
      AudioManager.playBGMFinal();
    } else if (isResume && bgmType === "main") {
      // Si es resume, forzamos play para desbloquear el motor de audio
      AudioManager.playBGM();
    }

    if (sectionId === "final") {
      this._videoElementForPausa = document.querySelector("video");
    }

    // 2. Narración (Instantánea si es Resume)
    if (sectionData.audio && this._isAudioStarted) {
      if (isResume) {
        AudioManager.playNarration(sectionData.audio); // Play YA
      } else {
        setTimeout(() => AudioManager.playNarration(sectionData.audio), 500); // Delay suave
      }
    }
  },

  _fadeOut() {
    const overlay = document.getElementById("fade-overlay");
    if (overlay) {
      overlay.style.pointerEvents = "auto";
      overlay.style.opacity = "1";
    }
    return new Promise((r) => setTimeout(r, 500));
  },
  _fadeIn() {
    const overlay = document.getElementById("fade-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => (overlay.style.pointerEvents = "none"), 500);
    }
    return Promise.resolve();
  },
  _handleIntroPlay() {
    this._isAudioStarted = true;
    AudioManager.playBGM();
    this._activeBGMType = "main";
    Render.showContent();
    Render.hidePlayButton();
    if (config.sections.intro.audio) {
      AudioManager.playNarration(config.sections.intro.audio);
    }
  },
  _handleAudioUnlock() {
    if (!this._isAudioStarted) {
      this._isAudioStarted = true;
      if (this._currentSection === "countdown") AudioManager.playBGMFinal();
    }
  },
  _handleNarrationEnd() {
    if (this._currentSection === "intro") Render.showActions();
  },
  async _checkPausaUnlock() {
    if (this._isRemoteUnlockEnabled) {
      this._showPausaButton();
      return;
    }
    const unlockDate = new Date(config.global.unlockDate).getTime();
    let now = Date.now();
    try {
      const r = await fetch("https://worldtimeapi.org/api/ip");
      if (r.ok) {
        const d = await r.json();
        now = new Date(d.utc_datetime).getTime();
      }
    } catch (e) {}
    if (now >= unlockDate) {
      this._showPausaButton();
    }
  },
  _showPausaButton() {
    const acciones = document.getElementById("pausa-acciones");
    if (acciones) {
      acciones.classList.remove("hidden-content");
      acciones.classList.add("visible-content");
    }
  },
  _handlePausaNext(target) {
    Router.navigate(target);
    setTimeout(() => {
      if (this._videoElementForPausa) {
        this._videoElementForPausa
          .play()
          .catch((e) => console.log("Autoplay video:", e));
        Render.forceVideoFullscreen();
      }
    }, 100);
  },
  async _preloadCriticalAssets() {
    const intro = config.sections.intro;
    const decision = config.sections.decision;
    const assets = [
      { type: "image", src: intro.background },
      { type: "audio", src: intro.audio },
      { type: "image", src: decision.background },
      { type: "audio", src: config.global.audioBGM },
    ];
    try {
      await Preloader.loadAssets(assets, (p) =>
        Render.updateLoadingProgress(p)
      );
    } catch (e) {}
    Render.setIntroLoading(false);
  },
  _preloadNextSections(currentId) {
    const currentData = config.sections[currentId];
    if (currentData && currentData.onNavigate) {
      const nextId = currentData.onNavigate;
      const nextData = config.sections[nextId];
      if (nextData) {
        const assets = [];
        if (nextData.background)
          assets.push({ type: "image", src: nextData.background });
        if (nextData.audio) assets.push({ type: "audio", src: nextData.audio });
        if (assets.length > 0) Preloader.loadAssets(assets);
      }
    }
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
export default App;
