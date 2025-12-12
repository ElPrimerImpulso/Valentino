import config from "./config.js";
import Validation from "./validation.js";
import Countdown from "./countdown.js";

/**
 * render.js: El Constructor de Vistas
 * (Versión Final: Incluye Overlay para recuperar audio al recargar)
 */
const Render = {
  _callbacks: {},
  _rootElement: null,

  init(rootElement, callbacks) {
    this._rootElement = rootElement;
    this._callbacks = callbacks;
  },

  section(sectionId) {
    console.log(`[Render.js] Renderizando sección: ${sectionId}`);
    const data = config.sections[sectionId];
    if (!data) return;
    this._rootElement.innerHTML = "";

    // Si es Intro, usamos el layout especial
    if (data.type === "intro") {
      this._renderIntroLayout(data);
      return;
    }

    // Renderizado estándar
    if (data.title) {
      this._rootElement.appendChild(this._createTitle(data.title));
    }
    if (data.narrative) {
      this._rootElement.appendChild(this._createNarrative(data.narrative));
    }

    const controlesContainer = document.createElement("div");
    controlesContainer.className = "controles";

    switch (data.type) {
      case "decision":
        controlesContainer.appendChild(this._createDecisionControls(data));
        break;
      case "explanation":
        controlesContainer.appendChild(
          this._createExplanationControls(data, sectionId)
        );
        break;
      case "riddle":
        controlesContainer.appendChild(this._createRiddleControls(data));
        break;
      case "video":
        this._rootElement.appendChild(this._createVideoPlayer(data));
        break;
      case "countdown":
        controlesContainer.appendChild(this._createCountdownControls(data));
        break;
    }
    this._rootElement.appendChild(controlesContainer);

    if (data.type === "countdown") {
      Countdown.start(config.global.countdownDate);
    }
  },

  /**
   * NUEVA FUNCIÓN: Muestra un botón gigante para recuperar el audio
   * si el usuario recarga la página a mitad de camino.
   */
  showResumeOverlay(onResumeCallback) {
    console.log("[Render.js] Mostrando Overlay de Reanudación de Audio...");

    const overlay = document.createElement("div");
    overlay.id = "resume-audio-overlay";
    // Estilos inline para asegurar que tape todo y se vea bien
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0,0,0,0.95)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.color = "white";
    overlay.style.textAlign = "center";

    const msg = document.createElement("h2");
    msg.textContent = "Pausado";
    msg.style.marginBottom = "2rem";
    msg.style.fontFamily = "'Inter', sans-serif";

    const btn = document.createElement("button");
    btn.textContent = "Continuar Experiencia";
    // Reutilizamos estilos de tus botones
    btn.className = "play-center";
    btn.style.width = "auto";
    btn.style.padding = "1rem 2rem";
    btn.style.fontSize = "1.2rem";
    btn.style.borderRadius = "50px";
    btn.style.border = "2px solid white";
    btn.style.background = "transparent";
    btn.style.color = "white";
    btn.style.cursor = "pointer";

    btn.addEventListener("click", () => {
      // Efecto visual de salida
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.5s";
      setTimeout(() => overlay.remove(), 500);

      // Ejecutar callback para prender audio
      onResumeCallback();
    });

    overlay.appendChild(msg);
    overlay.appendChild(btn);
    document.body.appendChild(overlay);
  },

  // --- RESTO DE FUNCIONES (Iguales que antes) ---

  _renderIntroLayout(data) {
    const titleEl = this._createTitle(data.title);
    const narrativeEl = this._createNarrative(data.narrative);
    titleEl.classList.add("hidden-content");
    narrativeEl.classList.add("hidden-content");
    const controlesContainer = document.createElement("div");
    controlesContainer.className = "controles";
    controlesContainer.appendChild(this._createIntroPlayCenter(data));
    const accionesContainer = document.createElement("div");
    accionesContainer.className = "acciones hidden-content";
    accionesContainer.appendChild(this._createIntroActions(data));
    controlesContainer.appendChild(accionesContainer);
    this._rootElement.appendChild(titleEl);
    this._rootElement.appendChild(narrativeEl);
    this._rootElement.appendChild(controlesContainer);
  },

  _createTitle(text) {
    const titleEl = document.createElement("h1");
    titleEl.className = "titulo";
    titleEl.textContent = text;
    return titleEl;
  },

  _createNarrative(html) {
    const narrativeEl = document.createElement("p");
    narrativeEl.className = "narrativa";
    narrativeEl.innerHTML = html;
    return narrativeEl;
  },

  _createIntroPlayCenter(data) {
    const playCenter = document.createElement("div");
    playCenter.className = "play-center is-loading";
    playCenter.id = "play-center-control";

    const playButton = document.createElement("button");
    playButton.innerHTML = "<pre>▶</pre>";
    playButton.addEventListener("click", () => {
      this._callbacks.onIntroPlay();
      this.showContent();
      this.hidePlayButton();
    });

    const avisoVolumen = document.createElement("p");
    avisoVolumen.className = "aviso-volumen";
    avisoVolumen.textContent = "🔊 Sube el volumen antes de empezar";

    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "loading-indicator";
    loadingIndicator.innerHTML = `
      <div class="progress-bar-container">
        <div class="progress-bar-fill" id="progress-bar-fill"></div>
      </div>
      <div class="progress-percentage" id="progress-percentage">0%</div>
    `;

    playCenter.appendChild(loadingIndicator);
    playCenter.appendChild(playButton);
    playCenter.appendChild(avisoVolumen);
    return playCenter;
  },

  _createIntroActions(data) {
    const button = document.createElement("button");
    button.textContent = data.buttonText;
    button.addEventListener("click", () => {
      this._callbacks.onNavigate(data.onNavigate);
    });
    return button;
  },

  _createDecisionControls(data) {
    const acciones = document.createElement("div");
    acciones.className = "acciones";
    data.buttons.forEach((buttonData) => {
      const button = document.createElement("button");
      button.textContent = buttonData.text;
      if (buttonData.skipNarration) {
        button.addEventListener("click", () => {
          this._callbacks.onNavigateWithSkip(buttonData.target);
        });
      } else {
        button.addEventListener("click", () => {
          this._callbacks.onNavigate(buttonData.target);
        });
      }
      acciones.appendChild(button);
    });
    return acciones;
  },

  _createExplanationControls(data, sectionId) {
    const acciones = document.createElement("div");
    acciones.className = "acciones";
    if (data.buttonText) {
      const button = document.createElement("button");
      button.textContent = data.buttonText;

      if (sectionId === "pausa" && data.onNavigate === "final") {
        button.addEventListener("click", () => {
          this._callbacks.onPausaNext(data.onNavigate);
        });
      } else {
        button.addEventListener("click", () => {
          this._callbacks.onNavigate(data.onNavigate);
        });
      }
      acciones.appendChild(button);

      if (sectionId === "pausa") {
        acciones.classList.add("hidden-content");
        acciones.id = "pausa-acciones";
      }
    }
    return acciones;
  },

  _createRiddleControls(data) {
    const group = document.createElement("div");
    group.className = "input-group";
    const inputContainer = document.createElement("div");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Tu respuesta";
    input.id = `respuesta-${data.validationKey}`;
    const sendButton = document.createElement("button");
    sendButton.className = "send-button";
    sendButton.textContent = "Enviar";
    inputContainer.appendChild(input);
    inputContainer.appendChild(sendButton);
    const errorMsg = document.createElement("div");
    errorMsg.className = "mensaje-error";
    errorMsg.id = `error-${data.validationKey}`;
    group.appendChild(inputContainer);
    group.appendChild(errorMsg);
    sendButton.addEventListener("click", () => {
      Validation.check(input, errorMsg, data.validationKey, () => {
        this._callbacks.onNavigate(data.onSuccess);
      });
    });
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendButton.click();
    });
    return group;
  },

  _createVideoPlayer(data) {
    const videoContainer = document.createElement("div");
    videoContainer.className = "video-container";
    const video = document.createElement("video");
    video.src = data.video;
    video.playsInline = true;
    video.preload = "auto";
    video.autoplay = true;
    video.controls = false;
    video.addEventListener("ended", () => {
      this._callbacks.onNavigate(data.onNavigate);
    });
    video.addEventListener("play", () => {
      this._callbacks.onAudioUnlocked();
    });
    videoContainer.appendChild(video);
    return videoContainer;
  },

  _createCountdownControls(data) {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.width = "100%";

    const display = document.createElement("div");
    display.className = "countdown-display";
    display.innerHTML = `
      <div class="countdown-unit" id="unit-years"><span id="countdown-years">--</span><label>años</label></div>
      <div class="countdown-unit" id="unit-days"><span id="countdown-days">--</span><label>días</label></div>
      <div class="countdown-unit" id="unit-hours"><span id="countdown-hours">--</span><label>horas</label></div>
      <div class="countdown-unit" id="unit-minutes"><span id="countdown-minutes">--</span><label>minutos</label></div>
      <div class="countdown-unit" id="unit-seconds"><span id="countdown-seconds">--</span><label>segundos</label></div>
    `;

    const replayContainer = document.createElement("div");
    replayContainer.className = "acciones";
    replayContainer.style.marginTop = "3rem";
    replayContainer.style.opacity = "0";
    replayContainer.style.pointerEvents = "none";
    replayContainer.style.transition = "opacity 1.5s ease";

    const btn = document.createElement("button");
    btn.textContent = "🎬 Ver video otra vez";
    btn.style.opacity = "0.8";
    btn.addEventListener("click", () => {
      this._callbacks.onNavigate("final");
    });
    replayContainer.appendChild(btn);

    setTimeout(() => {
      if (replayContainer) {
        replayContainer.style.opacity = "1";
        replayContainer.style.pointerEvents = "auto";
      }
    }, 4000);

    container.appendChild(display);
    container.appendChild(replayContainer);
    return container;
  },

  setIntroLoading(isLoading) {
    const playCenter = document.getElementById("play-center-control");
    if (playCenter) {
      if (isLoading) playCenter.classList.add("is-loading");
      else playCenter.classList.remove("is-loading");
    }
  },

  updateLoadingProgress(percentage) {
    const fillEl = document.getElementById("progress-bar-fill");
    const textEl = document.getElementById("progress-percentage");
    if (!fillEl || !textEl) return;
    const percentNum = Math.floor(percentage * 100);
    fillEl.style.width = `${percentNum}%`;
    textEl.textContent = `${percentNum}%`;
    if (percentage === 1) textEl.textContent = "¡Listo!";
  },

  forceVideoFullscreen() {
    const video = this._rootElement.querySelector("video");
    if (video) {
      if (video.requestFullscreen)
        video.requestFullscreen().catch((err) => console.warn(err));
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    }
  },

  showContent() {
    this._rootElement.querySelectorAll(".hidden-content").forEach((el) => {
      if (el.tagName === "H1" || el.tagName === "P") {
        el.classList.remove("hidden-content");
        el.classList.add("visible-content");
      }
    });
  },

  hidePlayButton() {
    const playButton = this._rootElement.querySelector(".play-center");
    if (playButton) playButton.classList.add("hidden-content");
  },

  showActions() {
    const acciones = this._rootElement.querySelector(".acciones");
    if (acciones) {
      acciones.classList.remove("hidden-content");
      acciones.classList.add("visible-content");
    }
  },
};

export default Render;
