import config from "./config.js";

/**
 * audio-manager.js: El Sonidista (Versión Robusta)
 * Crea los elementos de audio si no existen en el HTML.
 */
const AudioManager = {
  _bgmEl: null,
  _bgmFinalEl: null,
  _narrationEl: null,
  _activeBGM: null,
  _fadeInterval: null,
  _callbacks: {},

  init(callbacks) {
    this._callbacks = callbacks || {};

    // --- CORRECCIÓN: Buscamos O Creados los elementos ---
    this._bgmEl = this._getOrCreateAudioElement("audio-bgm", true);
    this._bgmFinalEl = this._getOrCreateAudioElement("audio-bgm-final", true);
    this._narrationEl = this._getOrCreateAudioElement("audio-narration", false);

    // Asignar fuentes desde la configuración
    this._bgmEl.src = config.global.audioBGM;
    this._bgmFinalEl.src = config.global.audioBGMFinal;
    this._narrationEl.volume = config.audio.volumenNarracion;

    // Listeners de seguridad
    this._narrationEl.addEventListener("ended", () => this._onNarrationEnded());
    this._narrationEl.addEventListener("error", () => {
      console.warn("AudioManager: Error reproduciendo narración.");
      this._onNarrationEnded();
    });

    console.log("[Audio.js] AudioManager: Listo.");
  },

  /**
   * Helper para obtener o crear un elemento <audio>
   */
  _getOrCreateAudioElement(id, loop) {
    let el = document.getElementById(id);
    if (!el) {
      console.log(`[Audio.js] Creando elemento dinámico: #${id}`);
      el = document.createElement("audio");
      el.id = id;
      el.preload = "auto";
      if (loop) el.loop = true;
      document.body.appendChild(el);
    }
    return el;
  },

  playBGM() {
    if (!this._bgmEl.src) this._bgmEl.src = config.global.audioBGM;
    this._bgmEl.volume = config.audio.volumenFondoNormal;
    this._bgmEl.play().catch((e) => console.warn("playBGM() bloqueado:", e));
    this._activeBGM = this._bgmEl;
  },

  playBGMFinal() {
    if (!this._bgmFinalEl.src)
      this._bgmFinalEl.src = config.global.audioBGMFinal;
    this._bgmFinalEl.volume = config.audio.volumenFondoFinal;
    this._bgmFinalEl
      .play()
      .catch((e) => console.warn("playBGMFinal() bloqueado:", e));
    this._activeBGM = this._bgmFinalEl;
  },

  playNarration(src) {
    if (!src) {
      this._onNarrationEnded();
      return;
    }

    // Bajar volumen de la música si suena
    if (this._activeBGM) {
      this._fadeAudio(
        this._activeBGM,
        config.audio.volumenFondoBajo,
        config.audio.duracionFadeOut
      );
    }

    this._narrationEl.src = src;
    this._narrationEl.play().catch((e) => {
      console.error("Error narración:", e);
      this._onNarrationEnded();
    });
  },

  stopNarration() {
    this._stopAudio(this._narrationEl);
    this._onNarrationEnded();
  },

  stopAllBGM() {
    this._stopAudio(this._bgmEl);
    this._stopAudio(this._bgmFinalEl);
    this._activeBGM = null;
  },

  stopAll() {
    this.stopAllBGM();
    this._stopAudio(this._narrationEl);
    if (this._fadeInterval) clearInterval(this._fadeInterval);
  },

  _onNarrationEnded() {
    // Restaurar volumen de música
    if (this._activeBGM) {
      const targetVolume =
        this._activeBGM === this._bgmEl
          ? config.audio.volumenFondoNormal
          : config.audio.volumenFondoFinal;
      this._fadeAudio(
        this._activeBGM,
        targetVolume,
        config.audio.duracionFadeIn
      );
    }

    if (this._callbacks.onNarrationEnd) {
      this._callbacks.onNarrationEnd();
    }
  },

  _stopAudio(element) {
    if (element) {
      element.pause();
      element.currentTime = 0;
    }
  },

  _fadeAudio(element, targetVolume, duration) {
    if (this._fadeInterval) {
      clearInterval(this._fadeInterval);
    }

    // Safety check por si el elemento no está listo
    if (!element) return;

    const startVolume = element.volume;
    if (Math.abs(startVolume - targetVolume) < 0.01) return;

    const steps = 20; // Menos pasos para mejor rendimiento
    const stepTime = duration / steps;
    const volumeStep = (targetVolume - startVolume) / steps;

    this._fadeInterval = setInterval(() => {
      let newVolume = element.volume + volumeStep;

      // Limites seguros entre 0 y 1
      if (newVolume < 0) newVolume = 0;
      if (newVolume > 1) newVolume = 1;

      // Verificación de fin
      const finished =
        (volumeStep > 0 && newVolume >= targetVolume) ||
        (volumeStep < 0 && newVolume <= targetVolume);

      if (finished) {
        element.volume = targetVolume;
        clearInterval(this._fadeInterval);
        this._fadeInterval = null;
      } else {
        element.volume = newVolume;
      }
    }, stepTime);
  },
};

export default AudioManager;
