import { IProtocolStrategy, ProtocolStrategyInput, TemplateTarget } from "../interfaces/protocol-strategy.interface";

const KNOWN_ACRONYMS = new Set([
  "AI", "IA", "API", "APIS", "REST", "SOAP", "SQL", "NOSQL",
  "HTML", "CSS", "JS", "TS", "JSON", "XML", "YAML", "HTTP", "HTTPS",
  "TCP", "IP", "UDP", "DNS", "DHCP", "FTP", "SSH", "SSL", "TLS",
  "OWASP", "CVE", "NIST", "ISO", "IEEE", "VPN", "LAN", "WAN",
  "OS", "SO", "CPU", "RAM", "SSD", "HDD", "IOT",
  "DOS", "DDOS", "XSS", "CSRF", "SSRF", "RCE", "WAF", "SIEM", "SOC",
  "IAM", "RBAC", "JWT", "AWS", "GCP", "CI", "CD", "TDD", "BDD", "DDD", "SOLID",
  "ACID", "CRUD", "ORM", "SPA", "UI", "UX", "POO", "OOP", "MVC", "SDK", "CLI"
]);

const ROMAN_NUMERALS = /^(?:X{0,3})(?:IX|IV|V?I{0,3})$/i;
const MINOR_WORDS = new Set(["de", "del", "en", "para", "por", "y", "e", "o", "u", "la", "el", "los", "las", "un", "una", "unos", "unas", "con", "a"]);

export abstract class BaseProtocolStrategy implements IProtocolStrategy {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly requiresParticipants: boolean;
  abstract readonly defaultParticipantsText: string;
  abstract readonly templatePath: string;

  abstract buildPrompt(input: ProtocolStrategyInput): string;
  abstract extractSections(rawText: string, input: ProtocolStrategyInput): Record<string, string>;
  abstract getTemplateTargets(extracted: Record<string, string>): TemplateTarget[];

  protected cleanTopicName(raw: string, isInline = false): string {
    if (!raw) return "";
    let text = raw
      .trim()
      .replace(/^[•*-]\s*/, "")
      .replace(/[.,;:\s]+$/, "")
      .trim();
    if (!text) return "";

    const letters = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "");
    const isAllCaps = letters.length > 2 && letters === letters.toUpperCase();

    if (isAllCaps) {
      const words = text.split(/\s+/);
      const converted = words.map((w, idx) => {
        const cleanW = w.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (KNOWN_ACRONYMS.has(cleanW) || ROMAN_NUMERALS.test(cleanW)) {
          return cleanW;
        }
        const lower = w.toLowerCase();
        if (idx === 0 && !isInline) {
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        }
        return lower;
      });
      text = converted.join(" ");
    } else if (isInline) {
      const firstWord = text.split(/\s+/)[0];
      const cleanFirst = firstWord.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (!KNOWN_ACRONYMS.has(cleanFirst) && !ROMAN_NUMERALS.test(cleanFirst)) {
        text = text.charAt(0).toLowerCase() + text.slice(1);
      }
    }

    return text;
  }

  protected formatTopicList(topics: string[], isInline = true): string {
    const cleaned = topics.map((t) => this.cleanTopicName(t, isInline)).filter(Boolean);
    if (cleaned.length === 0) return "los temas principales";
    if (cleaned.length === 1) return cleaned[0];
    if (cleaned.length === 2) {
      const connector = /^[iíIÍ]/.test(cleaned[1]) ? "e" : "y";
      return `${cleaned[0]} ${connector} ${cleaned[1]}`;
    }
    const allButLast = cleaned.slice(0, -1).join(", ");
    const last = cleaned[cleaned.length - 1];
    const connector = /^[iíIÍ]/.test(last) ? "e" : "y";
    return `${allButLast} ${connector} ${last}`;
  }

  protected cleanMateriaName(raw: string): string {
    if (!raw) return "Materia no especificada";
    const text = raw.trim().replace(/[.,;:\s]+$/, "");
    if (!text) return "Materia no especificada";

    const letters = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "");
    const isAllCaps = letters.length > 2 && letters === letters.toUpperCase();

    if (!isAllCaps) {
      return text;
    }

    const words = text.split(/\s+/);
    const converted = words.map((w, idx) => {
      const cleanW = w.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (KNOWN_ACRONYMS.has(cleanW) || ROMAN_NUMERALS.test(cleanW)) {
        return cleanW;
      }
      const lower = w.toLowerCase();
      if (idx > 0 && MINOR_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    });

    return converted.join(" ");
  }

  protected sanitizeAllCapsWords(text: string): string {
    return text.replace(/\b([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{1,})+\b)/g, (match) => {
      const words = match.split(/\s+/);
      const converted = words.map((w) => {
        const cleanW = w.replace(/[^A-Z0-9]/g, "");
        if (KNOWN_ACRONYMS.has(cleanW) || ROMAN_NUMERALS.test(cleanW)) {
          return cleanW;
        }
        return w.toLowerCase();
      });
      return converted.join(" ");
    });
  }

  protected formatSubstitutions(
    template: string,
    input: ProtocolStrategyInput,
    fallbackParticipants: string
  ): string {
    const materiaLimpia = this.cleanMateriaName(input.materia);
    const rawTemas = input.temas.map((t) => t.trim()).filter(Boolean);
    const primerTemaLimpio = rawTemas.length > 0 ? this.cleanTopicName(rawTemas[0], true) : "el tema principal";
    const temasTexto = this.formatTopicList(rawTemas, true);

    let participantesTexto = "";
    if (input.participantes && input.participantes.length > 0) {
      participantesTexto = input.participantes
        .map((p) => this.titleCaseName(p))
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
      .split("[tema]")
      .join(primerTemaLimpio)
      .split("[TEMA]")
      .join(primerTemaLimpio)
      .split("[PARTICIPANTES]")
      .join(participantesTexto)
      .replace(/([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ])\.\.(?!\.)/g, "$1.");
  }

  protected normalizeSectionText(value: string): string {
    const cleaned = value
      .replace(/^#+\s*/gm, "")
      .replace(/^(?:[-•]|\*(?!\*))\s+/gm, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .replace(/([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ])\.\.(?!\.)/g, "$1.")
      .replace(/\.,/g, ",")
      .trim();

    return this.sanitizeAllCapsWords(cleaned);
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
        let term = match[1].trim().replace(/^\*\*|\*\*$/g, "").trim();
        term = this.cleanTopicName(term, false);
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
