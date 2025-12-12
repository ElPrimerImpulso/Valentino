// Usar los nombres de archivo correctos
import config from "./config.js";
import FirebaseManager from "./firebase-manager.js";

/**
 * validation.js: El Validador de Acertijos
 * (Versión Robusta: Normalización estricta)
 */
const Validation = {
  /**
   * Normaliza un string para facilitar la comparación.
   * 1. A minúsculas.
   * 2. Quita espacios al inicio/final.
   * 3. Elimina tildes (á -> a).
   * 4. Elimina signos de puntuación (.,;:!¡?¿).
   */
  _normalize(str) {
    return str
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quitar tildes y diacríticos
      .replace(/[.,;:!¡?¿"']/g, ""); // <--- NUEVO: Quitar puntuación para evitar errores por un punto o coma
  },

  /**
   * Verifica la respuesta de un acertijo.
   */
  check(inputEl, errorEl, validationKey, onSuccess) {
    const userInput = inputEl.value; // Guardamos lo que escribió tal cual para el registro
    const normalizedInput = this._normalize(userInput); // Normalizamos para comparar

    const validAnswers = config.validation[validationKey];
    if (!validAnswers) {
      console.error(
        `Validación: No se encontró la clave "${validationKey}" en config.js.`
      );
      return;
    }

    // Comparamos la entrada limpia con las respuestas permitidas (que ya deben estar limpias en config.js)
    const isCorrect = validAnswers.some(
      (ans) => this._normalize(ans) === normalizedInput
    );

    /* Nota: Usamos .some() y re-normalizamos 'ans' por seguridad, 
       aunque tus respuestas en config.js ya deberían estar en minúsculas.
    */

    // --- GUARDADO EN FIREBASE ---
    // Guardamos el intento (sea correcto o no) para monitorear a Valentino
    FirebaseManager.saveRiddleAttempt(validationKey, userInput, isCorrect);

    // Validación de campo vacío
    if (!normalizedInput) {
      errorEl.textContent = "Por favor, escribe una respuesta.";
      errorEl.classList.add("show");
      return;
    }

    if (isCorrect) {
      // ¡Éxito!
      errorEl.classList.remove("show");
      inputEl.disabled = true; // Bloquear input para que no siga escribiendo
      onSuccess();
    } else {
      // Error
      errorEl.textContent = "No es la respuesta correcta, reflexiona...";
      errorEl.classList.add("show");
      inputEl.value = ""; // Limpiar el input para que reintente cómodo
      inputEl.focus(); // Volver a poner el cursor en el campo
    }
  },
};

export default Validation;
