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
      .replace(/^[-*]\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .trim();
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

  protected extractByHeadingMap(
    protocolText: string,
    headingMap: Array<[string, string[]]>
  ): Record<string, string> {
    const normalized = protocolText.replace(/\r/g, "");
    const lines = normalized.split("\n");
    const sections: Record<string, string> = {};

    headingMap.forEach(([key]) => {
      const startIndex = lines.findIndex((line) => {
        const trimmed = line.trim().toUpperCase();
        return headingMap.some(
          ([currentKey, aliases]) =>
            currentKey === key &&
            aliases.some((alias) => trimmed === alias.toUpperCase() || trimmed.startsWith(alias.toUpperCase()))
        );
      });

      if (startIndex === -1) {
        return;
      }

      const nextStartIndex = lines.findIndex(
        (line, index) =>
          index > startIndex &&
          headingMap.some(
            ([currentKey, aliases]) =>
              currentKey !== key &&
              aliases.some(
                (alias) =>
                  line.trim().toUpperCase() === alias.toUpperCase() ||
                  line.trim().toUpperCase().startsWith(alias.toUpperCase())
              )
          )
      );

      const blockLines = lines.slice(startIndex + 1, nextStartIndex === -1 ? lines.length : nextStartIndex);
      const body = blockLines.join("\n").trim();
      sections[key] = this.normalizeSectionText(body || "");
    });

    return sections;
  }
}
