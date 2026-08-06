import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Falta VITE_GEMINI_API_KEY en .env");
}

const genAI = new GoogleGenerativeAI(apiKey);

export type ProtocolType = "individual" | "colaborativo";

export interface ProtocolInput {
  materia: string;
  temas: string[];
  participantes: string[];
  tipo?: ProtocolType;
}

const INDIVIDUAL_PROMPT = `
Eres un asistente profesional de redacción de protocolos académicos. Tu tarea es generar un protocolo individual completo y profesional basado en la siguiente estructura y contenido.
No debes incluir asteriscos ni numerales.

PROTOCOLO INDIVIDUAL - [NOMBRE DE LA MATERIA]

---

DESCRIPCIÓN DEL TEXTO O ACTIVIDAD A REALIZAR

[Un párrafo explicando de qué trata el protocolo, qué temas cubre, por qué es relevante académica y profesionalmente, tipo de estudio (teórico/práctico), y cómo se relaciona con la formación. Termina diciendo: "La actividad consiste en elaborar un protocolo individual donde demuestro mi comprensión de [TEMAS]."]


PALABRAS CLAVE

[8 palabras clave separadas por comas, sin punto final]


OBJETIVOS DE LAS LECTURAS O ACTIVIDAD A REALIZAR

Objetivo General:

[Un objetivo usando estructura: Verbo en infinitivo + Qué + Mediante qué]

Objetivos Específicos:

1. [Objetivo específico 1]

2. [Objetivo específico 2]

3. [Objetivo específico 3]


CONCEPTOS CLAVE Y DEFINICIONES

Extrae todos los conceptos importantes del material y preséntalos como una lista continua se debe incluir los temas principales. Ejemplo si el tema es arquitectura de software debe aparecer dicho termino allí.


No agrupes los conceptos en categorías, temas, secciones o apartados.
No generes encabezados como "Categoría 1", "Tema 1", "Fundamentos", "Planificación", etc.
Cada concepto debe aparecer inmediatamente seguido de su definición.
Ordena los conceptos siguiendo el mismo orden en que aparecen en el material de origen.
Incluye únicamente conceptos relevantes y sus definiciones, sin explicaciones adicionales ni ejemplos.
Mantén definiciones claras, precisas y concisas.

Formato de salida:

Concepto 1: Definición.

Concepto 2: Definición.

Concepto 3: Definición.

Concepto 4: Definición.

...continúa hasta incluir todos los conceptos relevantes del material.


RESUMEN DE LAS LECTURAS

[3-5 párrafos en primera persona explicando qué entendiste de cada tema principal. Inicia con: "A través del estudio de [TEMAS], comprendí que..." Usa conectores como "Sobre...", "La...", "Finalmente...". Debe mostrar comprensión profunda, no solo repetir definiciones]


METODOLOGÍA DE TRABAJO (CÓMO REALICÉ LA ACTIVIDAD)

[Un párrafo breve explicando: investigué sobre..., analicé ejemplos..., organicé conceptos..., reflexioné sobre...]


CONCLUSIONES

[UN SOLO PÁRRAFO denso que sintetiza aprendizajes principales, cómo fortalece formación profesional, cómo aplicar en contextos reales, y reflexión final como futuro profesional. Inicia con: "Después de estudiar [TEMAS], concluyo que..."]


DISCUSIONES Y RECOMENDACIONES

Pregunta para discusión:

[Una pregunta profunda que genere debate, no tiene respuesta única, y demuestra pensamiento crítico]

BIBLIOGRAFÍA

[8-10 referencias en formato APA, mezclando libros, estándares, artículos y recursos online]

Genera un protocolo profesional.
`;

const COLLABORATIVE_PROMPT = `
Eres un asistente profesional de redacción de protocolos académicos. Tu tarea es generar un protocolo colaborativo completo y profesional basado en la siguiente estructura y contenido.
No debes incluir asteriscos ni numerales.

PROTOCOLO COLABORATIVO - [NOMBRE DE LA MATERIA]

REGISTRO DE PARTICIPANTES
[PARTICIPANTES]

DESCRIPCIÓN DEL TEXTO O ACTIVIDAD A REALIZAR

[Un párrafo de 150-200 palabras que incluya en este orden:
1. Apertura: "En este protocolo colaborativo se aborda [tema]..."
2. Enumeración breve de 2-4 subtemas principales cubiertos
3. Frase obligatoria: "Este tema es relevante tanto en el ámbito académico como profesional porque [razón específica ligada al tema]"
4. Frase obligatoria: "La actividad realizada fue de tipo teórico-práctico, enfocándose en [qué se hizo] mediante estudio colaborativo y discusión grupal"
5. Cierre conectando con la formación profesional en ingeniería de software]

PALABRAS CLAVE

[Exactamente 8 palabras o términos técnicos separados por comas, sin punto final, ordenados de más general a más específico]

OBJETIVOS DE LAS LECTURAS O ACTIVIDAD A REALIZAR

Objetivo General:

[Estructura obligatoria: "Comprender" + tema principal + "mediante el análisis de" + 2-3 subtemas]

Objetivos Específicos:

1. [Verbo infinitivo] + subtema 1 + resultado esperado
2. [Verbo infinitivo diferente] + subtema 2 + resultado esperado
3. [Verbo infinitivo diferente a los anteriores] + subtema 3 + resultado esperado

(Cada objetivo específico cubre un subtema DIFERENTE del contenido proporcionado; no repetir verbos entre objetivos)

CONCEPTOS CLAVE Y DEFINICIONES

Extrae todos los conceptos importantes del material y preséntalos como una lista continua se debe incluir los temas principales. Ejemplo si el tema es arquitectura de software debe aparecer dicho termino allí.

No agrupes los conceptos en categorías, temas, secciones o apartados.
No generes encabezados como "Categoría 1", "Tema 1", "Fundamentos", "Planificación", etc.
Cada concepto debe aparecer inmediatamente seguido de su definición.
Ordena los conceptos siguiendo el mismo orden en que aparecen en el material de origen.
Incluye únicamente conceptos relevantes y sus definiciones, sin explicaciones adicionales ni ejemplos.
Mantén definiciones claras, precisas y concisas.

Formato de salida:

Concepto 1: Definición.

Concepto 2: Definición.

Concepto 3: Definición.

Concepto 4: Definición.

...continúa hasta incluir todos los conceptos relevantes del material.

RESUMEN DE LAS DISCUSIONES GRUPALES

Durante nuestras discusiones grupales surgieron varios aspectos importantes sobre [tema]:

[Genera EXACTAMENTE 6 puntos con este formato:
-[Nombre corto del tema en 3-6 palabras]: [1-2 oraciones describiendo qué se debatió, con posiciones opuestas usando "Algunos argumentaban que... otros defendían que..." o "Hubo diferentes opiniones sobre..."]. [Cierre con "Concordamos en..." O "No hubo consenso sobre..." — alternar entre ambos cierres a lo largo de los 6 puntos]

Cada punto debe tratar un aspecto DISTINTO y específico del contenido, basado en tensiones reales (trade-offs, decisiones de diseño, aplicabilidad práctica), no genérico]

ENCUENTROS CONCEPTUALES

[Genera EXACTAMENTE 6 puntos donde el equipo coincidió, rotando estas fórmulas de apertura:
- "Todos concordamos en que..."
- "Hubo acuerdo unánime en que..."
- "El grupo concordó en que..."
- "Todos estuvimos de acuerdo en que..."
- "Hubo consenso en que..."
- "El grupo reconoció que..."

Cada punto: 1 oración de 20-30 palabras, específica al contenido, afirmando un aprendizaje o principio validado por el equipo]

DESENCUENTROS CONCEPTUALES

[Genera EXACTAMENTE 6 puntos con este formato:
- [Nombre corto del desacuerdo]: [Postura A] mientras [Postura B]. [Cierre: "No hubo consenso sobre..." o "No se llegó a acuerdo sobre..."]

Deben ser desacuerdos GENUINOS y plausibles relacionados a decisiones de diseño, trade-offs técnicos o aplicabilidad en diferentes contextos (empresas grandes vs pequeñas, startups vs corporativos, etc.). No repetir temas ya usados en la sección de Encuentros Conceptuales]

METODOLOGÍA DE TRABAJO (CÓMO SE HIZO LA ACTIVIDAD COLABORATIVA)

Para realizar esta actividad colaborativa dividimos los temas entre los [dos/tres/etc., según indique el usuario; si no especifica, usar "dos"] integrantes del grupo para investigar de manera individual. Posteriormente nos reunimos para compartir los hallazgos de cada uno y discutir los conceptos principales. Durante las discusiones identificamos puntos de acuerdo y desacuerdo sobre las tecnologías estudiadas. Luego trabajamos de forma conjunta en un documento compartido para integrar la información, definir conceptos clave y elaborar las conclusiones. Finalmente realizamos una revisión colaborativa del protocolo completo antes de la entrega.

(Usar SIEMPRE este texto exacto, solo ajustando el número de integrantes)

CONCLUSIONES

[UN SOLO PÁRRAFO de 150-200 palabras, sin viñetas, con esta estructura interna:
1. Apertura obligatoria: "Después de estudiar y discutir colaborativamente [tema], concluimos que..."
2. Síntesis de 2-3 aprendizajes principales
3. Frase conectando con fortalecimiento de formación profesional en equipo
4. Frase de aplicación práctica en contextos reales
5. Cierre reflexivo sobre el valor del trabajo colaborativo específicamente (no solo del contenido)]

DISCUSIONES Y RECOMENDACIONES

Pregunta 1:
[Pregunta de 30-50 palabras que presente un trade-off o decisión compleja del tema, respondible de múltiples formas válidas, terminando en signo de interrogación]

Pregunta 2:
[Pregunta de 30-50 palabras sobre aplicación práctica, dilema ético/profesional o escenario hipotético relacionado al tema]

(Las preguntas no deben tener respuesta obvia y deben requerir conectar múltiples conceptos del protocolo; no repetir puntos ya cubiertos en el resumen de discusiones)

BIBLIOGRAFÍA

[8-10 referencias en formato APA 7, numeradas del 1 al 10, ordenadas alfabéticamente por apellido de autor:
- Mínimo 2 libros técnicos reconocidos del área
- Mínimo 2 estándares internacionales (ISO, IEEE) si aplica al tema
- Mínimo 1 recurso online oficial (documentación, sitio de organización relevante)
- Resto: artículos académicos, guías o libros complementarios]

Genera un protocolo profesional.
`;

export function buildProtocolPrompt({ materia, temas, participantes, tipo = "colaborativo" }: ProtocolInput) {
  const materiaLimpia = materia.trim() || "Materia no especificada";
  const temasLimpios = temas.map((tema) => tema.trim()).filter(Boolean);
  const temasTexto = temasLimpios.length > 0 ? temasLimpios.join(", ") : "los temas principales";

  let participantesTexto = "";
  if (participantes && participantes.length > 0) {
    participantesTexto = participantes
      .map((p) => p.trim())
      .filter(Boolean)
      .join("\n");
  } else {
    participantesTexto = tipo === "individual"
      ? "Nombre del estudiante"
      : "Nombre del estudiante 1\nNombre del estudiante 2\nNombre del estudiante 3";
  }

  const promptTemplate = tipo === "individual" ? INDIVIDUAL_PROMPT : COLLABORATIVE_PROMPT;

  return promptTemplate
    .split("[NOMBRE DE LA MATERIA]")
    .join(materiaLimpia)
    .split("[TEMAS]")
    .join(temasTexto)
    .split("[PARTICIPANTES]")
    .join(participantesTexto);
}

export async function testGemini(input: ProtocolInput = { materia: "", temas: [], participantes: [] }) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = buildProtocolPrompt(input);
  const reqStart = Date.now();
  console.info(`[gemini] Starting request at ${new Date(reqStart).toISOString()}`);
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    const duration = Date.now() - reqStart;
    console.info(`[gemini] Response received (${duration} ms) length=${String(text).length}`);
    return text;
  } catch (err) {
    const duration = Date.now() - reqStart;
    console.error(`[gemini] Error after ${duration} ms:`, err);
    throw err;
  }
}