import config from "./config.js";

/**
 * router.js: El Navegante (Versión Robusta con Promesas)
 */

// Variable para desbloquear la promesa de inicialización
let _resolveInit;
const _initPromise = new Promise((resolve) => {
  _resolveInit = resolve;
});

const Router = {
  _onNavigate: null,

  init(onNavigateCallback) {
    console.log("[Router] Inicializando...");
    this._onNavigate = onNavigateCallback;

    // 1. Desbloqueamos la promesa: Ya tenemos callback
    _resolveInit();

    // 2. Listeners
    window.addEventListener("hashchange", () => this._handleHashChange());
    window.addEventListener("load", () => this._handleHashChange());

    // Si ya cargó, forzamos chequeo (por si acaso)
    if (document.readyState === "complete") {
      this._handleHashChange();
    }
  },

  async _handleHashChange() {
    // 3. ESPERAMOS A QUE INIT HAYA TERMINADO (Bloqueo seguro)
    await _initPromise;

    let sectionId = window.location.hash.substring(1);
    if (!sectionId) sectionId = "intro";

    if (config.sections[sectionId]) {
      console.log(`[Router] Navegando a: ${sectionId}`);
      this._onNavigate(sectionId);
    } else {
      console.warn(`[Router] Sección desconocida: ${sectionId}. Redirigiendo.`);
      this.navigate("intro", true);
    }
  },

  navigate(sectionId, replace = false) {
    if (sectionId === window.location.hash.substring(1)) return;
    if (replace) window.location.replace(`#${sectionId}`);
    else window.location.hash = sectionId;
  },
};

export default Router;
