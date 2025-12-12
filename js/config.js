/**
 * config.js: Configuración Central del Proyecto Navidad.
 * (Fechas separadas correctamente: Desbloqueo 2025, Contador 2027)
 */
const config = {
  // Configuración global
  global: {
    // Si no se escucha la música, cambia esto a "./assets/audio/background_video.mp3"
    audioBGM: "./assets/audio/background.mp3",
    audioBGMFinal: "./assets/audio/background-final.mp3",

    // FECHA 1: El objetivo del CONTADOR VISUAL (al final de la experiencia)
    // Se apunta al 15 de Diciembre de 2027
    countdownDate: "2027-12-15T00:00:00",

    // FECHA 2: Cuándo se DESBLOQUEA el botón "Siguiente" en la Pausa
    // Se apunta a la Navidad de este año (2025)
    unlockDate: "2025-12-25T00:00:00",
  },

  // Configuración de audio
  audio: {
    volumenFondoNormal: 0.3,
    volumenFondoBajo: 0.08,
    volumenFondoFinal: 0.25,
    volumenNarracion: 0.8,
    duracionFadeIn: 2000,
    duracionFadeOut: 1200,
  },

  // Respuestas de acertijos
  validation: {
    constancia: ["constancia", "la constancia", "mi constancia", "constante"],
    paciencia: ["paciencia", "la paciencia", "paciencias"],
    disciplina: ["disciplina", "la disciplina"],
  },

  // Definición de todas las secciones
  sections: {
    // --- Flujo Principal (Paciente) ---
    intro: {
      type: "intro",
      step: 0,
      title: "¡Bienvenido Valentino!",
      narrative:
        "Lo hiciste.<br>Empujaste la bola de nieve.<br>Ahí va, rodando montaña abajo, girando sobre sí misma.<br>Todavía es pequeña, pero cada vuelta la alimenta.<br>Cada segundo la fortalece.<br>Es como si tuviera hambre... hambre de tiempo.<br><br>Esta no es una aventura de correr como loco, Valentino. No no no...<br>Esta es una aventura de espera, de descubrir qué sucede cuando dejás que el tiempo haga su magia.<br><br>Prepárate para lo que viene.",
      background: "./assets/img/intro-bg.png",
      audio: "./assets/audio/intro.mp3",
      buttonText: "Comenzar",
      onNavigate: "decision",
    },
    decision: {
      type: "decision",
      step: 1,
      title: "La Gran Decisión",
      narrative:
        "Y aquí, en este preciso momento, el destino se bifurca.<br><br>A tu izquierda, el primer camino brilla como el oro.<br>'¡Detén la bola ahora!' grita.<br>'Tu regalo ya es tuyo. ¿Para qué esperar?'<br>Es tentador. Muy tentador.<br><br>A tu derecha, el segundo camino se pierde en la niebla.<br>Solo una voz suave susurra:<br>'Déjala rodar... Si confías, crecerá más de lo que imaginas.'<br><br>Uno te ofrece la gratificación inmediata.<br>El otro, algo mucho más grande.<br><br>¿Qué camino vas a elegir, Valentino?<br><br>Recuerda: una vez que des un paso, no habrá retorno",
      background: "./assets/img/decision-bg.png",
      audio: "./assets/audio/decision.mp3",
      buttons: [
        { text: "Camino Rápido", target: "confirmacion1" },
        { text: "Camino Paciente", target: "acertijo1" },
      ],
    },
    acertijo1: {
      type: "riddle",
      step: 2,
      title: "Insistir es construir",
      narrative:
        "En un taller lleno de chispas trabaja un hombre extraño.<br><br>Todos los días levanta su martillo y lo deja caer sobre el mismo pedazo de metal.<br><br>Martillo arriba, martillo abajo.<br>Una y otra vez.<br><br>Los vecinos le preguntan: '¿Por qué seguís?<br>Ese pedazo de hierro nunca va a cambiar.'<br><br>Pero él sonríe y continúa.<br><br>Sabe algo que otros no ven.<br><br>¿Qué convierte sus golpes, aparentemente iguales, en algo extraordinario?",
      background: "./assets/img/acertijo1-bg.png",
      audio: "./assets/audio/acertijo1.mp3",
      validationKey: "constancia",
      onSuccess: "explicacion1",
    },
    explicacion1: {
      type: "explanation",
      step: 3,
      narrative:
        "¡Exacto!<br><br>La constancia no es repetir por costumbre, sino mantener el esfuerzo hasta que lo invisible se vuelve visible.<br>Cada golpe suma, aunque al principio no se note.",
      background: "./assets/img/explicacion1-bg.png",
      audio: "./assets/audio/explicacion1.mp3",
      buttonText: "Siguiente",
      onNavigate: "acertijo2",
    },
    acertijo2: {
      type: "riddle",
      step: 4,
      title: "Esperar también es avanzar",
      narrative:
        "En un campo completamente seco hay un hombre que riega todos los días.<br><br>No hay ni una sola planta.<br><br>La tierra parece muerta.<br>Pero él viene cada mañana con su regadera llena, y riega como si algo fuera a crecer.<br><br>Los que pasan le dicen:<br>'Estás perdiendo el tiempo. Ahí nunca va a crecer nada.'<br><br>Pero él no se detiene.<br>Hay algo dentro de él que lo mantiene regando.<br><br>¿Qué es lo que lo sostiene cuando no ve ningún resultado?",
      background: "./assets/img/acertijo2-bg.png",
      audio: "./assets/audio/acertijo2.mp3",
      validationKey: "paciencia",
      onSuccess: "explicacion2",
    },
    explicacion2: {
      type: "explanation",
      step: 5,
      narrative:
        "¡Sí!<br><br>La paciencia: saber esperar con confianza, incluso cuando todavía no ves frutos.",
      background: "./assets/img/explicacion2-bg.png",
      audio: "./assets/audio/explicacion2.mp3",
      buttonText: "Siguiente",
      onNavigate: "acertijo3",
    },
    acertijo3: {
      type: "riddle",
      step: 6,
      title: "Sostener es llegar",
      narrative:
        "En medio del océano navega un capitán solitario.<br><br>Las tormentas lo golpean, las olas tratan de hundirlo, el viento quiere desviarlo.<br><br>Pero él sigue mirando su brújula, mantiene el mismo rumbo.<br><br>Una isla hermosa aparece a su derecha:<br>'Aquí podés descansar, hay comida y agua fresca.<br>¿Para qué seguir remando hacia lo desconocido?'<br><br>Pero él ni la mira.<br>Tiene los ojos fijos en su destino.<br><br>¿Qué es lo que lo mantiene firme cuando todo trata de detenerlo?",
      background: "./assets/img/acertijo3-bg.png",
      audio: "./assets/audio/acertijo3.mp3",
      validationKey: "disciplina",
      onSuccess: "explicacion3",
    },
    explicacion3: {
      type: "explanation",
      step: 7,
      narrative:
        "¡Perfecto!<br><br>La disciplina: seguir el rumbo elegido aunque aparezcan desvíos y tentaciones.",
      background: "./assets/img/explicacion3-bg.png",
      audio: "./assets/audio/explicacion3.mp3",
      buttonText: "Siguiente",
      onNavigate: "pausa",
    },

    // --- SECCIÓN DE PAUSA ---
    pausa: {
      type: "explanation",
      step: 8,
      title: null,
      narrative:
        "Todavía no es el momento.<br>Pero lo reconocerás cuando llegue.",
      background: "./assets/img/explicacion3-bg.png",
      audio: "./assets/audio/pausa.mp3",
      buttonText: "Siguiente",
      onNavigate: "final",
    },

    // --- Finales ---
    final: {
      type: "video",
      step: 9,
      background: null,
      audio: null,
      video: "./assets/video/Final.mp4",
      onNavigate: "countdown",
    },
    countdown: {
      type: "countdown",
      step: 10,
      title: null,
      background: null,
      audio: null,
    },

    // --- Flujo Alternativo (Rápido) ---
    confirmacion1: {
      type: "decision",
      step: 2,
      title: "",
      narrative:
        "La bola se detiene a tus pies.<br>Brilla en la nieve,<br>lista para ser tomada.<br>Pero si escuchás con atención...<br>podés oír el eco de lo que pudo haber sido.<br>¿Estás seguro?",
      background: "./assets/img/confirmacion1-bg.jpg",
      audio: "./assets/audio/confirmacion1.mp3",
      buttons: [
        { text: "Sí, quiero mi regalo ahora", target: "confirmacion2" },
        {
          text: "No, quiero seguir la aventura",
          target: "decision",
          skipNarration: true,
        },
      ],
    },
    confirmacion2: {
      type: "decision",
      step: 3,
      title: "",
      narrative:
        "Última oportunidad, Valentino.<br>Si la detenés ahora, la aventura termina aquí.<br>Lo que viene después... nunca lo sabrás.<br><br>¿De verdad querés que termine acá?",
      background: "./assets/img/confirmacion2-bg.png",
      audio: "./assets/audio/confirmacion2.mp3",
      buttons: [
        { text: "Sí, estoy seguro", target: "final2" },
        { text: "No, quiero volver", target: "decision", skipNarration: true },
      ],
    },
    final2: {
      type: "explanation",
      step: 4,
      title: "Final",
      narrative:
        "La bola de nieve se quedó pequeña.<br><br>Cincuenta mil pesos son tuyos.<br><br>Un regalo real.<br>Algo concreto en tus manos.<br>Pero la montaña sigue ahí arriba, y la avalancha que pudo haber sido... solo existirá en tu imaginación.<br><br>La aventura terminó antes de empezar.",
      background: "./assets/img/final2-bg.png",
      audio: "./assets/audio/final2.mp3",
      buttonText: null,
      onNavigate: null,
    },
  },

  // --- Mapa de Pasos ---
  stepToSectionMap: {
    0: "intro",
    1: "decision",
    2: "acertijo1",
    3: "explicacion1",
    4: "acertijo2",
    5: "explicacion2",
    6: "acertijo3",
    7: "explicacion3",
    8: "pausa",
    9: "final",
    10: "countdown",
  },
};

export default config;
