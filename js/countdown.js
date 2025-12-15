/**
 * countdown.js: El Temporizador (Versión Calendario Preciso)
 * Corregido para calcular años reales y no matemáticos.
 */
const Countdown = {
  _intervalId: null,
  _revealTimeouts: [],
  _previousValues: {},

  /**
   * Calcula el tiempo restante usando fechas calendario reales.
   * Evita el error de las "horas fantasma" de los años bisiestos promedio.
   */
  _calculateTime(targetDateMs) {
    const now = new Date();
    const target = new Date(targetDateMs);

    // Si ya pasó la fecha
    if (target <= now) return null;

    // 1. Calcular AÑOS completos reales (ej: 2027 - 2025 = 2)
    let years = target.getFullYear() - now.getFullYear();

    // Creamos una fecha temporal sumando esos años a hoy para ver si nos pasamos
    // (Ej: Si hoy es 20/12/2025 y target 15/12/2027, la resta de años da 2,
    // pero al sumar 2 años nos pasamos del target, así que en realidad falta 1 año y pico).
    const dateWithYears = new Date(now);
    dateWithYears.setFullYear(now.getFullYear() + years);

    // Si al sumar los años nos pasamos de la fecha target, restamos un año
    if (dateWithYears > target) {
      years--;
      dateWithYears.setFullYear(now.getFullYear() + years);
    }

    // 2. Calcular la diferencia restante desde "Hoy + Años" hasta el Target
    const diff = target.getTime() - dateWithYears.getTime();

    // 3. Convertir esa diferencia restante en días, horas, etc.
    const s = 1000;
    const m = s * 60;
    const h = m * 60;
    const d = h * 24;

    const dias = Math.floor(diff / d);
    const horas = Math.floor((diff % d) / h);
    const minutos = Math.floor((diff % h) / m);
    const segundos = Math.floor((diff % m) / s);

    return { años: years, dias, horas, minutos, segundos };
  },

  _revealUnit(id, value, delay) {
    const timer = setTimeout(() => {
      const unitEl = document.getElementById(`unit-${id}`);
      const spanEl = document.getElementById(`countdown-${id}`);

      if (unitEl && spanEl) {
        // Formato a 2 dígitos (0 -> 00)
        const textValue = String(value).padStart(2, "0");
        spanEl.textContent = textValue;
        this._previousValues[id] = textValue;
        unitEl.classList.add("is-visible");
      }
    }, delay);

    this._revealTimeouts.push(timer);
  },

  _updateUnit(id, value) {
    const spanEl = document.getElementById(`countdown-${id}`);
    if (!spanEl) return;

    const textValue = String(value).padStart(2, "0");

    if (this._previousValues[id] !== textValue) {
      this._previousValues[id] = textValue;
      spanEl.textContent = textValue;
      spanEl.classList.add("is-pulsing");
      setTimeout(() => {
        spanEl.classList.remove("is-pulsing");
      }, 150);
    }
  },

  start(targetDateISO) {
    console.log("[Countdown.js] Iniciando...");
    this.stop();

    const targetDateMs = new Date(targetDateISO).getTime();

    // Cálculo inicial
    const initialTime = this._calculateTime(targetDateMs);

    if (!initialTime) {
      this._revealAllZeros();
      return;
    }

    // Secuencia de revelación (De segundos a años)
    this._revealUnit("seconds", initialTime.segundos, 1500);
    this._revealUnit("minutes", initialTime.minutos, 3000);
    this._revealUnit("hours", initialTime.horas, 4500);
    this._revealUnit("days", initialTime.dias, 6000);
    this._revealUnit("years", initialTime.años, 7500);

    // Loop de actualización
    this._intervalId = setInterval(() => {
      const time = this._calculateTime(targetDateMs);

      if (!time) {
        this.stop();
        this._updateAllZeros();
        return;
      }

      this._updateUnit("seconds", time.segundos);
      this._updateUnit("minutes", time.minutos);
      this._updateUnit("hours", time.horas);
      this._updateUnit("days", time.dias);
      this._updateUnit("years", time.años);
    }, 1000);
  },

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._revealTimeouts.forEach(clearTimeout);
    this._revealTimeouts = [];
    this._previousValues = {};
  },

  _revealAllZeros() {
    ["seconds", "minutes", "hours", "days", "years"].forEach((unit) =>
      this._revealUnit(unit, 0, 0)
    );
  },

  _updateAllZeros() {
    ["seconds", "minutes", "hours", "days", "years"].forEach((unit) =>
      this._updateUnit(unit, 0)
    );
  },
};

export default Countdown;
