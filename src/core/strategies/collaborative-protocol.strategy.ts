import { BaseProtocolStrategy } from "./base-protocol.strategy";
import { ProtocolStrategyInput, TemplateTarget } from "../interfaces/protocol-strategy.interface";
import { COLLABORATIVE_PROMPT } from "../prompts/collaborative.prompt";

export class CollaborativeProtocolStrategy extends BaseProtocolStrategy {
  readonly id = "colaborativo";
  readonly label = "Colaborativo";
  readonly requiresParticipants = true;
  readonly defaultParticipantsText =
    "Nombre del estudiante 1\nNombre del estudiante 2\nNombre del estudiante 3";
  readonly templatePath = "/templates/PLANTILLA%20PROTOCOLO%20COLABORATIVO.docx";

  buildPrompt(input: ProtocolStrategyInput): string {
    return this.formatSubstitutions(COLLABORATIVE_PROMPT, input, this.defaultParticipantsText);
  }

  extractSections(rawText: string, input: ProtocolStrategyInput): Record<string, string> {
    const headingMap: Array<[string, string[]]> = [
      ["title", ["PROTOCOLO COLABORATIVO", "PROTOCOLO COLABORATIVO -"]],
      [
        "registro",
        [
          "REGISTRO DE PARTICIPANTES",
          "REGISTRO DE LOS PARTICIPANTES",
          "PARTICIPANTES",
          "INTEGRANTES",
          "REGISTRO DE INTEGRANTES",
        ],
      ],
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
          "RESUMEN DE LAS DISCUSIONES GRUPALES",
          "RESUMEN DE DISCUSIONES GRUPALES",
          "RESUMEN DE LAS DISCUSIONES",
          "RESUMEN DE DISCUSIONES",
          "RESUMEN GRUPAL",
          "DISCUSIONES GRUPALES",
        ],
      ],
      [
        "encuentros",
        [
          "ENCUENTROS CONCEPTUALES",
          "ENCUENTROS",
          "PUNTOS DE ENCUENTRO",
          "ACUERDOS CONCEPTUALES",
          "PUNTOS DE ACUERDO",
        ],
      ],
      [
        "desacuerdos",
        [
          "DESENCUENTROS CONCEPTUALES",
          "DESENCUENTROS",
          "DESACUERDOS CONCEPTUALES",
          "DESACUERDOS",
          "PUNTOS DE DESENCUENTRO",
          "PUNTOS DE DESACUERDO",
        ],
      ],
      [
        "metodologia",
        [
          "METODOLOGÍA DE TRABAJO (CÓMO SE HIZO LA ACTIVIDAD COLABORATIVA)",
          "METODOLOGIA DE TRABAJO (CÓMO SE HIZO LA ACTIVIDAD COLABORATIVA)",
          "METODOLOGÍA DE TRABAJO (COMO SE HIZO LA ACTIVIDAD COLABORATIVA)",
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
          "PREGUNTAS PARA DISCUSIÓN",
          "PREGUNTAS PARA DISCUSION",
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

    const fallbackParticipants = input.participantes
      .map((p) => this.titleCaseName(p))
      .filter(Boolean)
      .join("\n");
    const fallbackTemas = input.temas
      .map((t) => this.cleanTopicName(t, false))
      .filter(Boolean)
      .join("\n");
    const rawFirst = input.temas.filter(Boolean)[0];
    const firstTema = rawFirst ? this.cleanTopicName(rawFirst, true) : "el tema";
    const materiaLimpia = this.cleanMateriaName(input.materia);
    const listadoTemas = this.formatTopicList(input.temas, true);

    const rawConceptos = sections.conceptos || `Conceptos principales relacionados con ${firstTema}.`;
    const rawObjetivos =
      sections.objetivos ||
      `**Objetivo General:** Comprender ${firstTema} mediante el análisis de ${input.temas.filter(Boolean).slice(1, 3).map((t) => this.cleanTopicName(t, true)).join(" y ") || "los contenidos del curso"}.`;
    const rawRecomendaciones =
      sections.recomendaciones ||
      "**Pregunta 1:** ¿En qué escenarios resulta más conveniente priorizar la simplicidad frente a la extensibilidad?\n\n**Pregunta 2:** ¿Cómo impacta el trabajo colaborativo en la calidad final del software?";
    const rawMetodologia = (sections.metodologia || "")
      .replace(/\s*\(Usar SIEMPRE[\s\S]*?\)/gi, "")
      .trim();

    const result: Record<string, string> = {
      title: `PROTOCOLO COLABORATIVO - ${materiaLimpia}`,
      registro: sections.registro || fallbackParticipants || "Participantes por definir",
      descripcion:
        sections.descripcion ||
        `Este protocolo aborda ${listadoTemas} en el contexto de ${materiaLimpia}.`,
      palabras:
        sections.palabras ||
        ["protocolo", "colaborativo", ...input.temas.map((t) => this.cleanTopicName(t, true)).filter(Boolean).slice(0, 6)].join(", "),
      objetivos: this.formatObjectives(rawObjetivos),
      conceptos: this.formatConceptDefinitions(rawConceptos),
      resumen: this.formatDiscussionSummary(
        sections.resumen ||
          `Se analizaron los aspectos más relevantes de ${firstTema} mediante discusión colaborativa.`
      ),
      encuentros: this.formatConceptualAgreements(
        sections.encuentros ||
          "El grupo coincidió en la importancia de trabajar de forma colaborativa y estructurada."
      ),
      desacuerdos: this.formatConceptualDisagreements(
        sections.desacuerdos ||
          "Se identificaron diferencias sobre la aplicación práctica de ciertas decisiones de diseño."
      ),
      metodologia:
        rawMetodologia ||
        "La actividad se desarrolló mediante investigación individual, discusión grupal y consolidación conjunta.",
      conclusiones:
        sections.conclusiones ||
        `Se concluyó que ${firstTema} requiere un análisis integral y una aplicación práctica sostenida.`,
      recomendaciones: this.formatRecommendations(rawRecomendaciones),
      bibliografia: this.formatBibliography(sections.bibliografia),
      temas: fallbackTemas || "Temas por definir",
    };

    if (result.palabras) {
      result.palabras = this.ensureEndsWithPeriod(result.palabras);
    }

    return result;
  }

  protected formatDiscussionSummary(text: string): string {
    if (!text) return text;
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return text;

    const formatted = lines.map((line, index) => {
      // Si es la primera línea y corresponde a la introducción (ej: "Durante las discusiones...")
      if (
        index === 0 &&
        (/^(durante|en las discusiones|a lo largo de)/i.test(line) ||
          (!line.includes(":") && !line.startsWith("•") && !line.startsWith("-")))
      ) {
        return line.replace(/^(?:(?:\d+[.)]|[-*•])\s*)+/, "").replace(/\*/g, "").trim();
      }

      // Remover cualquier viñeta, guion o número previo
      const content = line.replace(/^(?:(?:\d+[.)]|[-*•])\s*)+/, "").trim();

      const boldColonMatch = content.match(/^\*\*([^*:]+?)\*\*\s*:\s*(.*)$/);
      const plainColonMatch = content.match(/^([A-ZÁÉÍÓÚÑ][^:]{2,60})\s*:\s*(.*)$/);

      if (boldColonMatch) {
        const topic = boldColonMatch[1].trim();
        const rest = boldColonMatch[2].trim();
        return `• **${topic}:** ${rest}`;
      } else if (plainColonMatch) {
        const topic = plainColonMatch[1].replace(/\*/g, "").trim();
        const rest = plainColonMatch[2].trim();
        return `• **${topic}:** ${rest}`;
      }

      return `• ${content}`;
    });

    return formatted.join("\n\n");
  }

  protected formatConceptualAgreements(text: string): string {
    if (!text) return text;
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return text;

    const formatted = lines.map((line) => {
      const content = line.replace(/^(?:(?:\d+[.)]|[-*•])\s*)+/, "").trim();
      return `• ${content}`;
    });

    return formatted.join("\n\n");
  }

  protected formatConceptualDisagreements(text: string): string {
    if (!text) return text;
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return text;

    const formatted = lines.map((line) => {
      const content = line.replace(/^(?:(?:\d+[.)]|[-*•])\s*)+/, "").trim();

      const boldColonMatch = content.match(/^\*\*([^*:]+?)\*\*\s*:\s*(.*)$/);
      const plainColonMatch = content.match(/^([A-ZÁÉÍÓÚÑ][^:]{2,60})\s*:\s*(.*)$/);

      if (boldColonMatch) {
        const topic = boldColonMatch[1].trim();
        const rest = boldColonMatch[2].trim();
        return `• **${topic}:** ${rest}`;
      } else if (plainColonMatch) {
        const topic = plainColonMatch[1].replace(/\*/g, "").trim();
        const rest = plainColonMatch[2].trim();
        return `• **${topic}:** ${rest}`;
      }

      return `• ${content}`;
    });

    return formatted.join("\n\n");
  }

  getTemplateTargets(extracted: Record<string, string>): TemplateTarget[] {
    return [
      {
        heading: ["Registro de los participantes", "Registro de los participantes."],
        content: extracted.registro,
      },
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
        heading: ["Resumen de las discusiones grupales.", "Resumen de las discusiones grupales"],
        content: extracted.resumen,
      },
      {
        heading: ["Encuentros conceptuales.", "Encuentros conceptuales"],
        content: extracted.encuentros,
      },
      {
        heading: ["Desencuentros conceptuales", "Desencuentros conceptuales."],
        content: extracted.desacuerdos,
      },
      {
        heading: [
          "Metodología de trabajo (Cómo se hizo la actividad colaborativa)",
          "Metodología de trabajo",
        ],
        content: extracted.metodologia,
      },
      {
        heading: ["Conclusiones", "Conclusiones."],
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
