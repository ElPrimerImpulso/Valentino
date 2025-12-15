/**
 * render.js: Motor Gráfico (Versión Ágil para Audio)
 */
import config from "./config.js";

const Render = {
  _root: null,
  _callbacks: {},
  _introLoading: true,

  init(rootElement, callbacks) {
    this._root = rootElement;
    this._callbacks = callbacks || {};
  },

  section(sectionId) {
    const data = config.sections[sectionId];
    if (!data) return;

    // Limpiamos contenido previo
    this._root.innerHTML = "";

    // Lógica según tipo de sección
    if (data.type === "intro") this._renderIntro(data);
    else if (data.type === "decision") this._renderDecision(data);
    else if (data.type === "riddle") this._renderRiddle(data);
    else if (data.type === "explanation") this._renderExplanation(data);
    else if (data.type === "video") this._renderVideo(data);
    else if (data.type === "countdown") this._renderCountdown(data);

    // Ajustamos clases globales
    document.body.className = `view-${sectionId}`;
  },

  // --- RENDERIZADORES ESPECÍFICOS ---

  _renderIntro(data) {
    const html = `
      <div class="intro-container">
         <h1 class="titulo">${data.title}</h1>
         <p class="narrativa">${data.narrative}</p>
         
         <div class="controles">
            <div id="play-center-control" class="play-center ${
              this._introLoading ? "is-loading" : ""
            }">
               <div class="loading-indicator">
                  <div class="progress-bar-container">
                    <div id="loading-fill" class="progress-bar-fill"></div>
                  </div>
                  <div id="loading-text" class="progress-percentage">0%</div>
               </div>
               
               <button id="btn-start" style="display:none;">▶</button>
               <div class="aviso-volumen" style="display:none;">Activa tu sonido 🔊</div>
            </div>

            <div id="intro-acciones" class="acciones hidden-content">
               <button id="btn-intro-next">${data.buttonText}</button>
            </div>
         </div>
      </div>
    `;
    this._root.innerHTML = html;

    // Event listeners
    const btnStart = document.getElementById("btn-start");
    if (btnStart) btnStart.onclick = () => this._callbacks.onIntroPlay();

    const btnNext = document.getElementById("btn-intro-next");
    if (btnNext)
      btnNext.onclick = () => this._callbacks.onNavigate(data.onNavigate);
  },

  _renderDecision(data) {
    const buttonsHtml = data.buttons
      .map(
        (btn) =>
          `<button data-target="${
            btn.target
          }" data-skip="${!!btn.skipNarration}">${btn.text}</button>`
      )
      .join("");

    this._root.innerHTML = `
      <h2 class="titulo">${data.title}</h2>
      <p class="narrativa">${data.narrative}</p>
      <div class="controles">
        <div class="acciones" style="flex-direction: column; gap: 1rem;">
          ${buttonsHtml}
        </div>
      </div>
    `;

    this._root.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        const target = btn.getAttribute("data-target");
        const skip = btn.getAttribute("data-skip") === "true";
        if (skip) this._callbacks.onNavigateWithSkip(target);
        else this._callbacks.onNavigate(target);
      };
    });
  },

  _renderRiddle(data) {
    this._root.innerHTML = `
      <h2 class="titulo">${data.title}</h2>
      <p class="narrativa">${data.narrative}</p>
      
      <div class="controles">
        <div class="input-group">
           <div>
             <input type="text" id="riddle-input" placeholder="Tu respuesta..." autocomplete="off">
             <button id="riddle-send" class="send-button">➜</button>
           </div>
           <div id="riddle-error" class="mensaje-error"></div>
        </div>
      </div>
    `;

    // Importación dinámica para evitar ciclos circulares fuertes
    import("./validation.js").then((mod) => {
      const Validation = mod.default;
      const input = document.getElementById("riddle-input");
      const send = document.getElementById("riddle-send");
      const error = document.getElementById("riddle-error");

      const validate = () => {
        Validation.check(input, error, data.validationKey, () => {
          this._callbacks.onNavigate(data.onSuccess);
        });
      };

      send.onclick = validate;
      input.onkeypress = (e) => {
        if (e.key === "Enter") validate();
      };
    });
  },

  _renderExplanation(data) {
    let html = `
      <p class="narrativa" style="font-size: 1.8rem;">${data.narrative}</p>
      <div class="controles">
        <div class="acciones">
           <button id="btn-expl-next">${data.buttonText || "Continuar"}</button>
        </div>
      </div>
    `;

    // Caso especial Pausa
    if (document.body.classList.contains("view-pausa")) {
      html = `
         <p class="narrativa">${data.narrative}</p>
         <div class="controles">
            <div id="pausa-acciones" class="acciones hidden-content">
               <button id="btn-pausa-next">${data.buttonText}</button>
            </div>
         </div>
       `;
    }

    this._root.innerHTML = html;

    const btn = document.getElementById(
      document.body.classList.contains("view-pausa")
        ? "btn-pausa-next"
        : "btn-expl-next"
    );
    if (btn)
      btn.onclick = () => {
        if (document.body.classList.contains("view-pausa")) {
          this._callbacks.onPausaNext(data.onNavigate);
        } else {
          this._callbacks.onNavigate(data.onNavigate);
        }
      };
  },

  _renderVideo(data) {
    this._root.innerHTML = `
      <div class="video-container">
        <video id="final-video" playsinline webkit-playsinline>
          <source src="${data.video}" type="video/mp4">
        </video>
        <button id="btn-unmute-video" style="position:absolute; bottom:20px; right:20px; z-index:50; background:rgba(0,0,0,0.5); color:white; border:none; padding:10px; border-radius:5px;">
           🔇 Activar Sonido
        </button>
      </div>
    `;

    const video = document.getElementById("final-video");
    const btnUnmute = document.getElementById("btn-unmute-video");

    // Manejo de video
    video.onended = () => this._callbacks.onNavigate(data.onNavigate);

    // Intento de autoplay
    video
      .play()
      .then(() => {
        // Si arrancó bien
      })
      .catch(() => {
        // Si falló, mostrar botón grande (o usar el unmute)
        btnUnmute.innerText = "▶ REPRODUCIR";
      });

    // Desbloqueo de Audio en video
    btnUnmute.onclick = () => {
      video.muted = false;
      video.play();
      btnUnmute.style.display = "none";
      this._callbacks.onAudioUnlocked();
    };

    // Click en video también desbloquea
    video.onclick = () => {
      if (video.paused) {
        video.play();
        video.muted = false;
        btnUnmute.style.display = "none";
      }
    };
  },

  _renderCountdown(data) {
    this._root.innerHTML = `
      <div class="countdown-display">
         <div class="countdown-unit">
            <span id="cd-days">00</span>
            <label>Días</label>
         </div>
         <div class="countdown-unit">
            <span id="cd-hours">00</span>
            <label>Horas</label>
         </div>
         <div class="countdown-unit">
            <span id="cd-minutes">00</span>
            <label>Minutos</label>
         </div>
         <div class="countdown-unit">
            <span id="cd-seconds">00</span>
            <label>Segundos</label>
         </div>
      </div>
    `;

    // Importación dinámica
    import("./countdown.js").then((mod) => {
      mod.default.start(config.global.countdownDate, this._updateCountdownUI);
    });
  },

  _updateCountdownUI(t) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val < 10 ? "0" + val : val;
    };
    set("cd-days", t.days);
    set("cd-hours", t.hours);
    set("cd-minutes", t.minutes);
    set("cd-seconds", t.seconds);

    // Animación simple
    const secEl = document.getElementById("cd-seconds");
    if (secEl) {
      secEl.classList.remove("is-pulsing");
      void secEl.offsetWidth;
      secEl.classList.add("is-pulsing");
    }

    // Fade in secuencial al inicio
    document.querySelectorAll(".countdown-unit").forEach((el, i) => {
      setTimeout(() => el.classList.add("is-visible"), i * 200);
    });
  },

  // --- HELPERS DE UI ---

  showContent() {
    const titles = this._root.querySelectorAll(".titulo, .narrativa");
    titles.forEach((el) => (el.style.opacity = 1));
  },

  hidePlayButton() {
    const pc = document.getElementById("play-center-control");
    if (pc) pc.style.display = "none";
  },

  showActions() {
    const act = document.getElementById("intro-acciones");
    if (act) {
      act.classList.remove("hidden-content");
      act.classList.add("visible-content");
    }
  },

  // --- CARGA ---
  setIntroLoading(isLoading) {
    this._introLoading = isLoading;
    const pc = document.getElementById("play-center-control");
    if (!pc) return; // Si ya no estamos en intro, salir.

    if (isLoading) {
      pc.classList.add("is-loading");
      const btn = document.getElementById("btn-start");
      const warn = document.querySelector(".aviso-volumen");
      if (btn) btn.style.display = "none";
      if (warn) warn.style.display = "none";
    } else {
      pc.classList.remove("is-loading");
      const btn = document.getElementById("btn-start");
      const warn = document.querySelector(".aviso-volumen");
      if (btn) btn.style.display = "block";
      if (warn) warn.style.display = "block";
    }
  },

  updateLoadingProgress(percent) {
    const fill = document.getElementById("loading-fill");
    const text = document.getElementById("loading-text");
    if (fill) fill.style.width = percent + "%";
    if (text) text.innerText = Math.floor(percent) + "%";
  },

  // --- SOLUCIÓN AL "DOBLE CLIC" (Resume Overlay) ---
  showResumeOverlay(onResume) {
    // Si ya existe, no crearlo de nuevo
    if (document.getElementById("resume-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "resume-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.85)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.color = "white";

    overlay.innerHTML = `
      <p style="margin-bottom:2rem; font-size:1.5rem; text-align:center; padding:0 1rem;">
         La conexión se ha pausado.
      </p>
      <button id="btn-resume-action" style="
        background: transparent;
        border: 2px solid #d54b11;
        color: #d54b11;
        padding: 1rem 3rem;
        font-size: 1.5rem;
        cursor: pointer;
        border-radius: 50px;
        font-family: inherit;
      ">
        CONTINUAR
      </button>
    `;

    document.body.appendChild(overlay);

    const btn = document.getElementById("btn-resume-action");

    // --- CLAVE: Evento directo y síncrono ---
    btn.onclick = () => {
      // 1. Quitar overlay inmediatamente
      overlay.remove();

      // 2. Ejecutar callback INMEDIATAMENTE (aquí se activará el audio)
      if (onResume) onResume();
    };
  },

  forceVideoFullscreen() {
    const v = document.getElementById("final-video");
    if (v && v.requestFullscreen) v.requestFullscreen();
    else if (v && v.webkitRequestFullscreen) v.webkitRequestFullscreen();
  },
};

export default Render;
