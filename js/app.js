import config from "./config.js";
import Router from "./router.js";
import Render from "./render.js";
import AudioManager from "./audio-manager.js";
import Countdown from "./countdown.js";
import Preloader from "./preloader.js";
import FirebaseManager from "./firebase-manager.js";

/**
 * app.js: El Orquestador
 * (Versión Final: El aviso de 'Audio Pausado' se omite en el Countdown)
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
    console.log("[App.js] 1. Proyecto Navidad: Iniciando...");
    AudioManager.init({ onNarrationEnd: this._handleNarrationEnd.bind(this) });

    Render.init(document.getElementById("app-root"), {
      onNavigate: (id) => Router.navigate(id),
      onIntroPlay: this._handleIntroPlay.bind(this),
      onNavigateWithSkip: (id) => Router.navigate(id),
      onAudioUnlocked: this._handleAudioUnlock.bind(this),
      onPausaNext: this._handlePausaNext.bind(this),
    });

    try {
      await FirebaseManager.init();
      this._isFirebaseConnected = true;
      console.log("[App.js] 2. Firebase conectado.");
      const progress = await FirebaseManager.loadProgress();
      if (progress && progress.maxStep !== undefined) {
        this._userMaxStep = progress.maxStep;
        if (progress.pausaUnlocked) this._isRemoteUnlockEnabled = true;
      }
      FirebaseManager.subscribeToProgress((data) => {
        this._handleRemoteUpdate(data);
      });
    } catch (error) {
      console.warn("[App.js] Modo Offline:", error);
      const local = JSON.parse(localStorage.getItem("navidad_progress"));
      if (local) this._userMaxStep = local.maxStep || 0;
    }

    Router.init((sectionId) => this.showSection(sectionId));
    this._preloadCriticalAssets();
  },

  _handleRemoteUpdate(data) {
    if (data.maxStep !== undefined) this._userMaxStep = data.maxStep;
    if (data.currentSection && data.currentSection !== this._currentSection) {
      Router.navigate(data.currentSection);
    }
    if (data.pausaUnlocked === true) {
      console.log("[App.js] 🔓 Desbloqueo manual recibido.");
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

    // Protección URL
    if (sectionData.step > this._userMaxStep + 1) {
      const safeSection = config.stepToSectionMap[this._userMaxStep] || "intro";
      Router.navigate(safeSection, true);
      return;
    }

    if (this._currentSection) await this._fadeOut();

    this._currentSection = sectionId;
    document.body.className = `view-${sectionId}`;

    if (this._isFirebaseConnected)
      FirebaseManager.updateCurrentLocation(sectionId);

    if (sectionData.step > this._userMaxStep) {
      this._userMaxStep = sectionData.step;
      if (this._isFirebaseConnected)
        FirebaseManager.saveProgress(sectionData.step, sectionId);
      localStorage.setItem(
        "navidad_progress",
        JSON.stringify({ maxStep: sectionData.step })
      );
    }

    AudioManager.stopNarration();
    if (sectionId !== "countdown") Countdown.stop();

    // 1. RENDERIZAR VISUALMENTE
    Render.section(sectionId);

    // 2. VERIFICAR PERMISO DE AUDIO
    // MODIFICADO: Agregamos '&& sectionId !== "countdown"' para no molestar ahí.
    if (
      !this._isAudioStarted &&
      sectionId !== "intro" &&
      sectionId !== "countdown"
    ) {
      console.warn(
        "[App.js] Audio bloqueado por recarga. Solicitando interacción..."
      );

      Render.showResumeOverlay(() => {
        console.log("[App.js] Audio reactivado por usuario.");
        this._isAudioStarted = true;
        this._executeAudioLogic(sectionId, sectionData);
      });
    } else {
      // Flujo directo (Intentará reproducir audio aunque falle si no hubo interacción previa)
      this._executeAudioLogic(sectionId, sectionData);
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

  _executeAudioLogic(sectionId, sectionData) {
    // 1. Música de Fondo (BGM)
    let bgmType = "main";
    if (sectionId === "countdown") bgmType = "final";
    else if (sectionId === "final") bgmType = "none";
    else if (sectionData.type === "intro") bgmType = "none";

    if (this._isAudioStarted && bgmType !== this._activeBGMType) {
      if (bgmType === "main") AudioManager.playBGM();
      else if (bgmType === "final") AudioManager.playBGMFinal();
      else AudioManager.stopAllBGM();
      this._activeBGMType = bgmType;
    } else if (sectionId === "countdown") {
      // Intento forzado para countdown si recargamos ahí (puede fallar sin interacción)
      AudioManager.playBGMFinal();
    }

    // 2. Referencias Video
    if (sectionId === "final") {
      this._videoElementForPausa = document.querySelector("video");
    }

    // 3. Narración
    if (sectionData.audio && this._isAudioStarted) {
      setTimeout(() => AudioManager.playNarration(sectionData.audio), 500);
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
      if (this._pausaCheckInterval) clearInterval(this._pausaCheckInterval);
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
      if (this._pausaCheckInterval) clearInterval(this._pausaCheckInterval);
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
