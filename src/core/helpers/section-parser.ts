import { ProtocolSection } from "../entities/protocol.entity";

const SECTION_PATTERNS = [
  { label: "Protocolo", regex: /^(PROTOCOLO|PROTOCOLO\s+INDIVIDUAL|PROTOCOLO\s+COLABORATIVO)/i },
  { label: "Registro", regex: /^(REGISTRO\s+DE\s+PARTICIPANTES)/i },
  { label: "Descripción", regex: /^(DESCRIPCIÓN|DESCRIPCION)/i },
  { label: "Palabras clave", regex: /^(PALABRAS\s+CLAVE|PALABRAS\s+CLAVES)/i },
  { label: "Objetivos", regex: /^(OBJETIVOS)/i },
  { label: "Conceptos", regex: /^(CONCEPTOS\s+CLAVE|CONCEPTOS)/i },
  { label: "Resumen", regex: /^(RESUMEN)/i },
  { label: "Encuentros", regex: /^(ENCUENTROS\s+CONCEPTUALES)/i },
  { label: "Desacuerdos", regex: /^(DESENCUENTROS\s+CONCEPTUALES)/i },
  { label: "Metodología", regex: /^(METODOLOGÍA|METODOLOGIA)/i },
  { label: "Conclusiones", regex: /^(CONCLUSIONES)/i },
  { label: "Recomendaciones", regex: /^(DISCUSIONES\s+Y\s+RECOMENDACIONES|RECOMENDACIONES)/i },
  { label: "Bibliografía", regex: /^(BIBLIOGRAFÍA|BIBLIOGRAFIA)/i },
];

export function parsePreviewSections(rawText: string): ProtocolSection[] {
  const text = rawText.replace(/\r/g, "").trim();
  if (!text) {
    return [];
  }

  const lines = text.split("\n");
  const sections: ProtocolSection[] = [];
  let currentTitle = "Resultado";
  let currentBody: string[] = [];

  const flush = () => {
    const cleanedBody = currentBody
      .map((line) => line.trim())
      .filter(Boolean);

    if (cleanedBody.length > 0) {
      sections.push({
        title: currentTitle,
        body: cleanedBody.join("\n").split(/\n{2,}/).map((entry) => entry.trim()).filter(Boolean),
      });
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentBody.length > 0) {
        currentBody.push("");
      }
      return;
    }

    const matchedSection = SECTION_PATTERNS.find(({ regex }) => regex.test(trimmed));
    if (matchedSection) {
      flush();
      currentTitle = matchedSection.label;
      currentBody = [];
      return;
    }

    currentBody.push(trimmed);
  });

  flush();

  return sections.length > 0 ? sections : [{ title: "Resultado", body: [text] }];
}
