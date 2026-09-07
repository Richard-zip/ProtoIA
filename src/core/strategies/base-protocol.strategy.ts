import { IProtocolStrategy, ProtocolStrategyInput, TemplateTarget } from "../interfaces/protocol-strategy.interface";

export abstract class BaseProtocolStrategy implements IProtocolStrategy {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly requiresParticipants: boolean;
  abstract readonly defaultParticipantsText: string;
  abstract readonly templatePath: string;

  abstract buildPrompt(input: ProtocolStrategyInput): string;
  abstract extractSections(rawText: string, input: ProtocolStrategyInput): Record<string, string>;
  abstract getTemplateTargets(extracted: Record<string, string>): TemplateTarget[];

  protected formatSubstitutions(
    template: string,
    input: ProtocolStrategyInput,
    fallbackParticipants: string
  ): string {
    const materiaLimpia = input.materia.trim() || "Materia no especificada";
    const temasLimpios = input.temas.map((tema) => tema.trim()).filter(Boolean);
    const temasTexto = temasLimpios.length > 0 ? temasLimpios.join(", ") : "los temas principales";

    let participantesTexto = "";
    if (input.participantes && input.participantes.length > 0) {
      participantesTexto = input.participantes
        .map((p) => p.trim())
        .filter(Boolean)
        .join("\n");
    } else {
      participantesTexto = fallbackParticipants;
    }

    return template
      .split("[NOMBRE DE LA MATERIA]")
      .join(materiaLimpia)
      .split("[TEMAS]")
      .join(temasTexto)
      .split("[PARTICIPANTES]")
      .join(participantesTexto);
  }

  protected normalizeSectionText(value: string): string {
    return value
      .replace(/^#+\s*/gm, "")
      .replace(/^(?:[-•]|\*(?!\*))\s+/gm, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .trim();
  }

  protected formatConceptDefinitions(text: string): string {
    if (!text) return text;
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const formatted = lines.map((line) => {
      const match = line.match(
        /^\s*(?:(?:\d+[.)]|[-*•])\s*)?(?:\*\*)?([^*\n:–—]+?)(?:\*\*)?\s*(?::\s*|\s*[-–—]\s*|\s*:\s*\*\*\s*)(.*)$/
      );

      if (match) {
        const term = match[1].trim().replace(/^\*\*|\*\*$/g, "").trim();
        let def = match[2].trim().replace(/^\*\*|\*\*$/g, "").trim();
        if (def.length > 0 && !/[.?!]$/.test(def)) {
          def = `${def}.`;
        }
        return `**${term}:** ${def}`;
      }

      return line;
    });

    return formatted.join("\n\n");
  }

  protected formatObjectives(text: string): string {
    if (!text) return text;
    let cleaned = text.trim();
    cleaned = cleaned.replace(/\s*\(Cada objetivo específico[\s\S]*?\)/gi, "");
    cleaned = cleaned.replace(
      /(?:\*\*Objetivo General:\*\*|\*\*Objetivo General\*\*|Objetivo General:?)\s*\n+([^\n]+)/i,
      "**Objetivo General:** $1"
    );
    cleaned = cleaned.replace(
      /(?:\*\*Objetivos Específicos:\*\*|\*\*Objetivos Específicos\*\*|Objetivos Específicos:?)\s*/i,
      "**Objetivos Específicos:**\n"
    );
    return cleaned.trim();
  }

  protected formatRecommendations(text: string): string {
    if (!text) return text;
    let cleaned = text.trim();
    cleaned = cleaned.replace(/\s*\(Las preguntas no deben tener[\s\S]*?\)/gi, "");
    cleaned = cleaned.replace(
      /(?:\*\*Pregunta 1:\*\*|\*\*Pregunta 1\*\*|Pregunta 1:?)\s*\n+([^\n]+)/gi,
      "**Pregunta 1:** $1"
    );
    cleaned = cleaned.replace(
      /(?:\*\*Pregunta 2:\*\*|\*\*Pregunta 2\*\*|Pregunta 2:?)\s*\n+([^\n]+)/gi,
      "**Pregunta 2:** $1"
    );
    cleaned = cleaned.replace(
      /(?:\*\*Pregunta para discusión:\*\*|\*\*Pregunta para discusión\*\*|Pregunta para discusión:?)\s*\n+([^\n]+)/gi,
      "**Pregunta para discusión:** $1"
    );
    return cleaned.trim();
  }

  protected ensureEndsWithPeriod(value: string): string {
    if (!value) return value;
    const v = value.trim();
    return /[.?!]$/.test(v) ? v : `${v}.`;
  }

  protected titleCaseName(name: string): string {
    if (!name) return name;
    return name
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : ""))
      .join(" ")
      .trim();
  }

  protected normalizeHeading(text: string): string {
    return text
      .trim()
      .replace(/^#+\s*/, "")
      .replace(/^(?:\d+[.)]|[-*•])\s+/, "")
      .replace(/^\*\*|\*\*$/g, "")
      .replace(/[:.]+$/, "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  protected lineMatchesHeading(line: string, aliases: string[]): boolean {
    const normLine = this.normalizeHeading(line);
    if (!normLine || normLine.split(" ").length > 12) {
      return false;
    }

    return aliases.some((alias) => {
      const normAlias = this.normalizeHeading(alias);
      if (!normAlias) return false;
      if (normLine === normAlias) return true;
      if (normLine.startsWith(normAlias)) return true;
      if (normLine.length >= 8 && normAlias.startsWith(normLine)) return true;
      return false;
    });
  }

  protected extractByHeadingMap(
    protocolText: string,
    headingMap: Array<[string, string[]]>
  ): Record<string, string> {
    const normalized = protocolText.replace(/\r/g, "");
    const lines = normalized.split("\n");
    const sections: Record<string, string> = {};

    headingMap.forEach(([key]) => {
      const startIndex = lines.findIndex((line) => {
        return headingMap.some(
          ([currentKey, aliases]) => currentKey === key && this.lineMatchesHeading(line, aliases)
        );
      });

      if (startIndex === -1) {
        return;
      }

      const nextStartIndex = lines.findIndex(
        (line, index) =>
          index > startIndex &&
          headingMap.some(
            ([currentKey, aliases]) => currentKey !== key && this.lineMatchesHeading(line, aliases)
          )
      );

      const blockLines = lines.slice(startIndex + 1, nextStartIndex === -1 ? lines.length : nextStartIndex);
      const body = blockLines.join("\n").trim();
      sections[key] = this.normalizeSectionText(body || "");
    });

    return sections;
  }
}
