import { BaseProtocolStrategy } from "./base-protocol.strategy";
import { ProtocolStrategyInput, TemplateTarget } from "../interfaces/protocol-strategy.interface";
import { INDIVIDUAL_PROMPT } from "../prompts/individual.prompt";

export class IndividualProtocolStrategy extends BaseProtocolStrategy {
  readonly id = "individual";
  readonly label = "Individual";
  readonly requiresParticipants = false;
  readonly defaultParticipantsText = "Nombre del estudiante";
  readonly templatePath = "/templates/PLANTILLA%20PROTOCOLO%20INDIVIDUAL.docx";

  buildPrompt(input: ProtocolStrategyInput): string {
    return this.formatSubstitutions(INDIVIDUAL_PROMPT, input, this.defaultParticipantsText);
  }

  extractSections(rawText: string, input: ProtocolStrategyInput): Record<string, string> {
    const headingMap: Array<[string, string[]]> = [
      ["title", ["PROTOCOLO INDIVIDUAL", "PROTOCOLO INDIVIDUAL -"]],
      [
        "descripcion",
        [
          "DESCRIPCIÓN DEL TEXTO O ACTIVIDAD A REALIZAR",
          "DESCRIPCION DEL TEXTO O ACTIVIDAD A REALIZAR",
          "DESCRIPCIÓN DE LA ACTIVIDAD",
          "DESCRIPCION DE LA ACTIVIDAD",
          "DESCRIPCIÓN DEL TEXTO",
          "DESCRIPCION DEL TEXTO",
        ],
      ],
      [
        "palabras",
        [
          "PALABRAS CLAVE",
          "PALABRAS CLAVES",
          "PALABRAS CLAVE Y TÉRMINOS",
          "PALABRAS CLAVE Y TERMINOS",
        ],
      ],
      [
        "objetivos",
        [
          "OBJETIVOS DE LAS LECTURAS O ACTIVIDAD A REALIZAR",
          "OBJETIVOS DE LAS LECTURAS O ACTIVIDAD",
          "OBJETIVOS DE LAS LECTURAS",
          "OBJETIVOS DE LA ACTIVIDAD",
          "OBJETIVOS",
        ],
      ],
      [
        "conceptos",
        [
          "CONCEPTOS CLAVE Y DEFINICIONES",
          "CONCEPTOS CLAVES Y DEFINICIONES",
          "CONCEPTOS CLAVE",
          "CONCEPTOS CLAVES",
          "CONCEPTOS Y DEFINICIONES",
          "DEFINICIONES Y CONCEPTOS",
          "DEFINICIONES",
        ],
      ],
      [
        "resumen",
        [
          "RESUMEN DE LAS LECTURAS",
          "RESUMEN DE LAS LECTURAS O ACTIVIDAD",
          "RESUMEN DE LA LECTURA O ACTIVIDAD",
          "RESUMEN DE LA LECTURA",
          "RESUMEN DE LECTURAS",
          "RESUMEN",
        ],
      ],
      [
        "metodologia",
        [
          "METODOLOGÍA DE TRABAJO (CÓMO REALICÉ LA ACTIVIDAD)",
          "METODOLOGIA DE TRABAJO (CÓMO REALICÉ LA ACTIVIDAD)",
          "METODOLOGÍA DE TRABAJO (COMO REALICE LA ACTIVIDAD)",
          "METODOLOGÍA DE TRABAJO",
          "METODOLOGIA DE TRABAJO",
          "METODOLOGÍA",
          "METODOLOGIA",
        ],
      ],
      [
        "conclusiones",
        [
          "CONCLUSIONES DE LA LECTURA O ACTIVIDAD",
          "CONCLUSIONES",
          "CONCLUSION",
        ],
      ],
      [
        "recomendaciones",
        [
          "DISCUSIONES Y RECOMENDACIONES",
          "DISCUSION Y RECOMENDACIONES",
          "PREGUNTAS DE DISCUSIÓN",
          "PREGUNTA PARA DISCUSIÓN",
          "PREGUNTAS PARA DISCUSIÓN",
          "PREGUNTA PARA DISCUSION",
          "RECOMENDACIONES Y DISCUSIONES",
          "RECOMENDACIONES",
        ],
      ],
      [
        "bibliografia",
        [
          "BIBLIOGRAFÍA",
          "BIBLIOGRAFIA",
          "REFERENCIAS BIBLIOGRÁFICAS",
          "REFERENCIAS BIBLIOGRAFICAS",
          "REFERENCIAS",
          "FUENTES CONSULTADAS",
        ],
      ],
    ];

    const sections = this.extractByHeadingMap(rawText, headingMap);

    const fallbackTemas = input.temas.filter(Boolean).join("\n");
    const firstTema = input.temas.filter(Boolean)[0] || "el tema";

    const rawConceptos = sections.conceptos || `Conceptos principales relacionados con ${firstTema}.`;
    const rawObjetivos =
      sections.objetivos ||
      `**Objetivo General:** Comprender ${firstTema} mediante el análisis de ${input.temas.filter(Boolean).slice(1, 3).join(" y ") || "los contenidos del curso"}.`;
    const rawRecomendaciones =
      sections.recomendaciones ||
      "**Pregunta para discusión:** ¿En qué medida los conceptos analizados pueden ser aplicados directamente en proyectos reales?";

    const result: Record<string, string> = {
      title: `PROTOCOLO INDIVIDUAL - ${input.materia || "Materia"}`,
      descripcion:
        sections.descripcion ||
        `Este protocolo aborda ${input.temas.filter(Boolean).join(", ") || "los temas principales"} en el contexto de ${input.materia || "la materia"}.`,
      palabras:
        sections.palabras ||
        ["protocolo", "individual", ...input.temas.filter(Boolean).slice(0, 6)].join(", "),
      objetivos: this.formatObjectives(rawObjetivos),
      conceptos: this.formatConceptDefinitions(rawConceptos),
      resumen:
        sections.resumen ||
        `Se analizaron los aspectos más relevantes de ${firstTema} mediante lectura y reflexión personal.`,
      metodologia:
        sections.metodologia ||
        "La actividad se desarrolló mediante investigación, análisis de conceptos y reflexión personal.",
      conclusiones:
        sections.conclusiones ||
        `Se concluyó que ${firstTema} requiere un análisis integral y una aplicación práctica sostenida.`,
      recomendaciones: this.formatRecommendations(rawRecomendaciones),
      bibliografia: sections.bibliografia || "Bibliografía por completar.",
      temas: fallbackTemas || "Temas por definir",
    };

    if (result.palabras) {
      result.palabras = this.ensureEndsWithPeriod(result.palabras);
    }

    return result;
  }

  getTemplateTargets(extracted: Record<string, string>): TemplateTarget[] {
    return [
      {
        heading: ["Descripción del texto o actividad a realizar.", "Descripción del texto o actividad a realizar"],
        content: extracted.descripcion,
      },
      {
        heading: ["Palabras claves.", "Palabras clave"],
        content: extracted.palabras,
      },
      {
        heading: ["Objetivos de las lecturas o actividad a realizar.", "Objetivos de las lecturas"],
        content: extracted.objetivos,
      },
      {
        heading: ["Conceptos claves y definiciones", "Conceptos clave y definiciones"],
        content: extracted.conceptos,
      },
      {
        heading: [
          "Resumen de la(as) lecturas .",
          "Resumen de las lecturas",
          "Resumen de las lecturas.",
          "Resumen de las lecturas o actividad",
        ],
        content: extracted.resumen,
      },
      {
        heading: ["Metodología de trabajo (Cómo realizó la actividad)", "Metodología de trabajo"],
        content: extracted.metodologia,
      },
      {
        heading: ["Conclusiones de la lectura o actividad.", "Conclusiones"],
        content: extracted.conclusiones,
      },
      {
        heading: ["Discusiones y recomendaciones", "Discusiones y recomendaciones."],
        content: extracted.recomendaciones,
      },
      {
        heading: ["Bibliografía.", "Bibliografía"],
        content: extracted.bibliografia,
      },
    ];
  }
}
