import JSZip from "jszip";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textMatchesHeading(value: string, heading: string | string[]): boolean {
  const normalizedValue = normalizeText(value);
  const headings = Array.isArray(heading) ? heading : [heading];
  return headings.some((candidate) => {
    const normalizedHeading = normalizeText(candidate);
    return normalizedHeading.length > 0 && (normalizedValue.includes(normalizedHeading) || normalizedHeading.includes(normalizedValue));
  });
}

function paragraphMatchesHeading(value: string, heading: string | string[]): boolean {
  const normalizedValue = normalizeText(value);
  const headings = Array.isArray(heading) ? heading : [heading];
  return headings.some((candidate) => {
    const normalizedHeading = normalizeText(candidate);
    if (!normalizedHeading) return false;
    // Strict matching: equality or prefix match (heading at start of paragraph)
    if (normalizedValue === normalizedHeading) return true;
    if (normalizedValue.startsWith(normalizedHeading)) return true;
    if (normalizedHeading.startsWith(normalizedValue)) return true;
    return false;
  });
}

function appendColonIfMissing(paragraphXml: string): string {
  const text = stripTags(paragraphXml).trim();
  if (/:$/.test(text)) return paragraphXml;

  // Try to reuse the last run's rPr if present so the colon matches styling.
  const runMatches = paragraphXml.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g) || [];
  let rPr = "";
  if (runMatches.length) {
    const lastRun = runMatches[runMatches.length - 1];
    const rPrMatch = lastRun.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
    if (rPrMatch) {
      rPr = `<w:rPr>${rPrMatch[1]}</w:rPr>`;
    }
  }

  const colonRun = `<w:r>${rPr}<w:t xml:space="preserve">:</w:t></w:r>`;
  return paragraphXml.replace(/<\/w:p>\s*$/, `${colonRun}</w:p>`);
}

/**
 * Extracts the <w:pPr>...</w:pPr> and run <w:rPr>...</w:rPr> from a heading
 * paragraph so inserted content paragraphs reuse the template's Arial +
 * justified formatting. Any bold flag is dropped so body text is not bold.
 */
function extractParagraphStyles(headingParagraph: string): { pPr: string; rPr: string } {
  const pPrMatch = headingParagraph.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  let pPr = pPrMatch ? pPrMatch[0] : "";
  // The paragraph properties carry an <w:rPr> for the paragraph mark; strip it
  // so we can build a clean run-level rPr from the actual run instead.
  pPr = pPr.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, "").replace(/<w:b\b[^>]*\/>/g, "");

  // Prefer the run properties from the first run that carries font info.
  const runMatches = headingParagraph.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g) || [];
  let rPrInner = "";
  for (const run of runMatches) {
    const rPr = run.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
    if (rPr && rPr[1].includes("w:rFonts")) {
      rPrInner = rPr[1];
      break;
    }
  }
  // Remove bold and heading color/size so body text looks like normal content.
  rPrInner = rPrInner
    .replace(/<w:b\b[^>]*\/>/g, "")
    .replace(/<w:color\b[^>]*\/>/g, "")
    .replace(/<w:sz\b[^>]*\/>/g, "")
    .replace(/<w:szCs\b[^>]*\/>/g, "")
    .replace(/<w:rtl\b[^>]*\/>/g, "");

  // Ensure LTR text direction is explicit.
  rPrInner = `${rPrInner}<w:rtl w:val="0"/>`;
  const rPr = `<w:rPr>${rPrInner}</w:rPr>`;

  return { pPr, rPr };
}

/**
 * Returns a bold variant of the given run properties by injecting <w:b/> and
 * <w:bCs/> so the label of title-like lines renders in bold.
 */
function makeBoldRPr(rPr: string): string {
  // Start from a clean run: drop any pre-existing bold flags so we never emit
  // duplicated <w:b>/<w:bCs> elements.
  const inner = rPr
    .replace(/^<w:rPr>/, "")
    .replace(/<\/w:rPr>$/, "")
    .replace(/<w:b\b[^>]*\/>/g, "")
    .replace(/<w:bCs\b[^>]*\/>/g, "");
  // Per the CT_RPr schema order, <w:b>/<w:bCs> must come after <w:rFonts>.
  const rFontsMatch = inner.match(/<w:rFonts\b[^>]*\/>/);
  const boldTags = "<w:b/><w:bCs/>";
  const withBold = rFontsMatch
    ? inner.replace(rFontsMatch[0], `${rFontsMatch[0]}${boldTags}`)
    : `${boldTags}${inner}`;
  return `<w:rPr>${withBold}</w:rPr>`;
}

/**
 * Detects a short "label:" prefix at the start of a paragraph (e.g.
 * "Objetivo General:", "Pregunta 1:", "Concepto 1:") so it can be rendered in
 * bold. Returns null when the paragraph is not a title-like line.
 */
function splitLabel(paragraph: string): { label: string; rest: string } | null {
  const colonIndex = paragraph.indexOf(":");
  if (colonIndex === -1) {
    return null;
  }

  const label = paragraph.slice(0, colonIndex).trim();
  // Only treat as a title when the prefix is short and does not look like a
  // full sentence (no sentence-ending punctuation inside it).
  if (label.length === 0 || label.length > 60 || /[.!?]/.test(label)) {
    return null;
  }

  const rest = paragraph.slice(colonIndex + 1).trim();
  return { label, rest };
}

function splitLabelOrListMarker(paragraph: string): { label: string; rest: string } | null {
  const label = splitLabel(paragraph);
  if (label) {
    return label;
  }

  const match = paragraph.match(/^\s*(\d+[.)])\s+(.*)$/);
  if (!match) {
    return null;
  }

  return {
    label: match[1],
    rest: match[2].trim(),
  };
}

function buildParagraphsXml(text: string, styles?: { pPr: string; rPr: string }): string {
  const paragraphs = text
    .split(/\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return "";
  }

  const pPr = styles?.pPr ?? "";
  const rPr = styles?.rPr ?? "";
  const boldRPr = makeBoldRPr(rPr);

  return paragraphs
    .map((paragraph) => {
      const label = splitLabelOrListMarker(paragraph);
      if (label) {
        const boldRun = `<w:r>${boldRPr}<w:t xml:space="preserve">${escapeXml(`${label.label}`)}</w:t></w:r>`;
        const restRun = label.rest
          ? `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(` ${label.rest}`)}</w:t></w:r>`
          : "";
        return `<w:p>${pPr}${boldRun}${restRun}</w:p>`;
      }

      const safeText = escapeXml(paragraph);
      return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${safeText}</w:t></w:r></w:p>`;
    })
    .join("");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "protocolo";
}

function ensureEndsWithPeriod(value: string): string {
  if (!value) return value;
  const v = value.trim();
  return /[.?!]$/.test(v) ? v : `${v}.`;
}

function titleCaseName(name: string): string {
  if (!name) return name;
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();
}

function normalizeSectionText(value: string): string {
  return value
    .replace(/^#+\s*/gm, "")
    .replace(/^[-*]\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    // Collapse only spaces/tabs, but keep newlines so multi-item sections
    // (conceptos, resumen, encuentros, bibliografía, ...) render as separate
    // paragraphs instead of a single blob.
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

function extractSections(protocolText: string, materia: string, participantes: string[], temas: string[], tipo: "individual" | "colaborativo") {
  const normalized = protocolText.replace(/\r/g, "");
  const lines = normalized.split("\n");
  const sections: Record<string, string> = {};
  const headingMap: Array<[string, string[]]> = tipo === "individual"
    ? [
        ["title", ["PROTOCOLO INDIVIDUAL", "PROTOCOLO INDIVIDUAL -"]],
        ["descripcion", ["DESCRIPCIÓN DEL TEXTO O ACTIVIDAD A REALIZAR", "DESCRIPCION DEL TEXTO O ACTIVIDAD A REALIZAR"]],
        ["palabras", ["PALABRAS CLAVE", "PALABRAS CLAVES"]],
        ["objetivos", ["OBJETIVOS DE LAS LECTURAS O ACTIVIDAD A REALIZAR", "OBJETIVOS DE LAS LECTURAS"]],
        ["conceptos", ["CONCEPTOS CLAVE Y DEFINICIONES"]],
        ["resumen", ["RESUMEN DE LAS LECTURAS", "RESUMEN DE LAS LECTURAS O ACTIVIDAD"]],
        ["metodologia", ["METODOLOGÍA DE TRABAJO", "METODOLOGIA DE TRABAJO", "METODOLOGÍA DE TRABAJO (CÓMO REALICÉ LA ACTIVIDAD)", "METODOLOGIA DE TRABAJO (CÓMO REALICÉ LA ACTIVIDAD)"]],
        ["conclusiones", ["CONCLUSIONES"]],
        ["recomendaciones", ["DISCUSIONES Y RECOMENDACIONES"]],
        ["bibliografia", ["BIBLIOGRAFÍA", "BIBLIOGRAFIA"]],
      ]
    : [
        ["title", ["PROTOCOLO COLABORATIVO", "PROTOCOLO COLABORATIVO -"]],
        ["registro", ["REGISTRO DE PARTICIPANTES", "REGISTRO DE LOS PARTICIPANTES"]],
        ["descripcion", ["DESCRIPCIÓN DEL TEXTO O ACTIVIDAD A REALIZAR", "DESCRIPCION DEL TEXTO O ACTIVIDAD A REALIZAR"]],
        ["palabras", ["PALABRAS CLAVE", "PALABRAS CLAVES"]],
        ["objetivos", ["OBJETIVOS DE LAS LECTURAS O ACTIVIDAD A REALIZAR", "OBJETIVOS DE LAS LECTURAS"]],
        ["conceptos", ["CONCEPTOS CLAVE Y DEFINICIONES"]],
        ["resumen", ["RESUMEN DE LAS DISCUSIONES GRUPALES"]],
        ["encuentros", ["ENCUENTROS CONCEPTUALES"]],
        ["desacuerdos", ["DESENCUENTROS CONCEPTUALES"]],
        ["metodologia", ["METODOLOGÍA DE TRABAJO", "METODOLOGIA DE TRABAJO"]],
        ["conclusiones", ["CONCLUSIONES"]],
        ["recomendaciones", ["DISCUSIONES Y RECOMENDACIONES"]],
        ["bibliografia", ["BIBLIOGRAFÍA", "BIBLIOGRAFIA"]],
      ];

  headingMap.forEach(([key]) => {
    const startIndex = lines.findIndex((line) => {
      const trimmed = line.trim();
      return headingMap.some(([currentKey, aliases]) => currentKey === key && aliases.some((alias: string) => trimmed.toUpperCase() === alias.toUpperCase() || trimmed.toUpperCase().startsWith(alias.toUpperCase())));
    });

    if (startIndex === -1) {
      return;
    }

    const nextStartIndex = lines.findIndex((line, index) => index > startIndex && headingMap.some(([currentKey, aliases]) => currentKey !== key && aliases.some((alias: string) => line.trim().toUpperCase() === alias.toUpperCase() || line.trim().toUpperCase().startsWith(alias.toUpperCase()))));
    const blockLines = lines.slice(startIndex + 1, nextStartIndex === -1 ? lines.length : nextStartIndex);
    const body = blockLines.join("\n").trim();
    sections[key] = normalizeSectionText(body || "");
  });

  const fallbackParticipants = participantes
    .map((p) => titleCaseName(p))
    .filter(Boolean)
    .join("\n");
  const fallbackTemas = temas.filter(Boolean).join("\n");

  const result: Record<string, string> = {
    title: tipo === "individual"
      ? `PROTOCOLO INDIVIDUAL - ${materia || "Materia"}`
      : `PROTOCOLO COLABORATIVO - ${materia || "Materia"}`,
    registro: sections.registro || fallbackParticipants || "Participantes por definir",
    descripcion: sections.descripcion || `Este protocolo aborda ${temas.filter(Boolean).join(", ") || "los temas principales"} en el contexto de ${materia || "la materia"}.`,
    palabras: sections.palabras || [tipo === "individual" ? "protocolo" : "protocolo", tipo === "individual" ? "individual" : "colaborativo", ...temas.filter(Boolean).slice(0, 6)].join(", "),
    objetivos: sections.objetivos || `Comprender ${temas.filter(Boolean)[0] || "el tema principal"} mediante el análisis de ${temas.filter(Boolean).slice(1, 3).join(" y ") || "los contenidos del curso"}.`,
    conceptos: sections.conceptos || `Conceptos principales relacionados con ${temas.filter(Boolean)[0] || "el tema"}.`,
    resumen: sections.resumen || `Se analizaron los aspectos más relevantes de ${temas.filter(Boolean)[0] || "el tema"} ${tipo === "individual" ? "mediante lectura y reflexión personal" : "mediante discusión colaborativa"}.`,
    encuentros: sections.encuentros || "El grupo coincidió en la importancia de trabajar de forma colaborativa y estructurada.",
    desacuerdos: sections.desacuerdos || "Se identificaron diferencias sobre la aplicación práctica de ciertas decisiones de diseño.",
    metodologia: sections.metodologia || (tipo === "individual"
      ? "La actividad se desarrolló mediante investigación, análisis de conceptos y reflexión personal."
      : "La actividad se desarrolló mediante investigación individual, discusión grupal y consolidación conjunta."),
    conclusiones: sections.conclusiones || `Se concluyó que ${temas.filter(Boolean)[0] || "el tema"} requiere un análisis integral y una aplicación práctica sostenida.`,
    recomendaciones: sections.recomendaciones || "Se recomienda profundizar en los temas tratados y contrastar distintas alternativas de solución.",
    bibliografia: sections.bibliografia || "Bibliografía por completar.",
    temas: fallbackTemas || "Temas por definir",
  };

  // Ensure the palabras clave field ends with a period as requested.
  if (result.palabras) {
    result.palabras = ensureEndsWithPeriod(result.palabras);
  }

  return result;
}

/**
 * Inserts the given content paragraphs INSIDE the cell, right after the
 * heading paragraph. Never emits paragraphs outside </w:tc> (which would be
 * invalid OOXML). The inserted paragraphs reuse the heading paragraph's
 * formatting (Arial + justified) so they match the template.
 */
function insertContentInCell(cellXml: string, heading: string | string[], rawContent: string): string {
  const content = (rawContent ?? "").trim();
  if (!content) {
    return cellXml;
  }

  const paragraphRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let injected = false;
  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Iterate paragraphs to find the first paragraph that matches the heading
  while ((match = paragraphRegex.exec(cellXml)) !== null) {
    const paragraph = match[0];
    const start = match.index;
    // push the segment between lastIndex and start
    if (start > lastIndex) {
      parts.push(cellXml.slice(lastIndex, start));
    }

    if (!injected && paragraphMatchesHeading(stripTags(paragraph), heading)) {
      injected = true;
      const paragraphWithColon = appendColonIfMissing(paragraph);
      const styles = extractParagraphStyles(paragraphWithColon);
      parts.push(paragraphWithColon + buildParagraphsXml(content, styles));
    } else {
      parts.push(paragraph);
    }

    lastIndex = paragraphRegex.lastIndex;
  }

  if (!injected) {
    return cellXml;
  }

  // append remaining tail
  if (lastIndex < cellXml.length) parts.push(cellXml.slice(lastIndex));

  return parts.join("");
}

export async function generateWordDocument({
  materia,
  content,
  participantes = [],
  temas = [],
  tipo = "colaborativo",
  templatePath,
}: {
  materia: string;
  content: string;
  participantes?: string[];
  temas?: string[];
  tipo?: "individual" | "colaborativo";
  templatePath?: string;
}) {
  const resolvedTemplatePath = templatePath ?? (tipo === "individual"
    ? "/PLANTILLA%20PROTOCOLO%20INDIVIDUAL.docx"
    : "/PLANTILLA%20PROTOCOLO%20COLABORATIVO.docx");

  const response = await fetch(resolvedTemplatePath);
  if (!response.ok) {
    throw new Error("No se pudo cargar la plantilla de Word");
  }

  const templateBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(templateBuffer);
  const documentPath = "word/document.xml";
  const documentXml = await zip.file(documentPath)?.async("string");

  if (!documentXml) {
    throw new Error("La plantilla de Word no contiene el documento principal");
  }

  const sections = extractSections(content, materia, participantes, temas, tipo);
  const templateTargets = tipo === "individual"
    ? [
        { heading: ["Descripción del texto o actividad a realizar.", "Descripción del texto o actividad a realizar"], content: sections.descripcion },
        { heading: ["Palabras claves.", "Palabras clave"], content: sections.palabras },
        { heading: ["Objetivos de las lecturas o actividad a realizar.", "Objetivos de las lecturas"], content: sections.objetivos },
        { heading: ["Conceptos claves y definiciones", "Conceptos clave y definiciones"], content: sections.conceptos },
        { heading: ["Resumen de la(as) lecturas .", "Resumen de las lecturas", "Resumen de las lecturas.", "Resumen de las lecturas o actividad"], content: sections.resumen },
        { heading: ["Metodología de trabajo (Cómo realizó la actividad)", "Metodología de trabajo"], content: sections.metodologia },
        { heading: ["Conclusiones de la lectura o actividad.", "Conclusiones"], content: sections.conclusiones },
        { heading: ["Discusiones y recomendaciones", "Discusiones y recomendaciones."], content: sections.recomendaciones },
        { heading: ["Bibliografía.", "Bibliografía"], content: sections.bibliografia },
      ]
    : [
        { heading: ["Registro de los participantes", "Registro de los participantes."], content: sections.registro },
        { heading: ["Descripción del texto o actividad a realizar.", "Descripción del texto o actividad a realizar"], content: sections.descripcion },
        { heading: ["Palabras claves.", "Palabras clave"], content: sections.palabras },
        { heading: ["Objetivos de las lecturas o actividad a realizar.", "Objetivos de las lecturas"], content: sections.objetivos },
        { heading: ["Conceptos claves y definiciones", "Conceptos clave y definiciones"], content: sections.conceptos },
        { heading: ["Resumen de las discusiones grupales.", "Resumen de las discusiones grupales"], content: sections.resumen },
        { heading: ["Encuentros conceptuales.", "Encuentros conceptuales"], content: sections.encuentros },
        { heading: ["Desencuentros conceptuales", "Desencuentros conceptuales."], content: sections.desacuerdos },
        { heading: ["Metodología de trabajo (Cómo se hizo la actividad colaborativa)", "Metodología de trabajo"], content: sections.metodologia },
        { heading: ["Conclusiones", "Conclusiones."], content: sections.conclusiones },
        { heading: ["Discusiones y recomendaciones", "Discusiones y recomendaciones."], content: sections.recomendaciones },
        { heading: ["Bibliografía.", "Bibliografía"], content: sections.bibliografia },
      ];

  let updatedXml = documentXml;
  // Single-pass over table cells in document order: for each cell, check which
  // template target it matches and inject that content (once). This preserves
  // the template's ordering and avoids duplicating large sections across cells.
  {
    const cellRegex = /<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g;
    let match: RegExpExecArray | null;
    const newXmlParts: string[] = [];
    let lastIndex = 0;
    const used = new Set<number>();

    while ((match = cellRegex.exec(updatedXml)) !== null) {
      const cell = match[0];
      const start = match.index;
      if (start > lastIndex) newXmlParts.push(updatedXml.slice(lastIndex, start));

      // Try to match each template target that hasn't been used yet.
      let injectedCell = cell;
      for (let i = 0; i < templateTargets.length; i++) {
        if (used.has(i)) continue;
        const { heading, content } = templateTargets[i];
        const updatedCell = insertContentInCell(cell, heading, content);
        if (updatedCell !== cell) {
          injectedCell = updatedCell;
          used.add(i);
          break;
        }
      }

      newXmlParts.push(injectedCell);
      lastIndex = cellRegex.lastIndex;
    }

    if (lastIndex < updatedXml.length) newXmlParts.push(updatedXml.slice(lastIndex));

    updatedXml = newXmlParts.join("");
  }

  zip.file(documentPath, updatedXml);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const materiaName = (materia || "Materia").trim();
  const baseName = `${tipo === "individual" ? "protocolo individual de" : "protocolo colaborativo de"} ${materiaName}`;
  // Sanitize characters invalid in Windows filenames
  const safeBase = baseName.replace(/[\/\\:?"<>|]/g, "-").trim();

  return {
    blob,
    fileName: `${safeBase}.docx`,
  };
}

export async function downloadWordDocument(options: Parameters<typeof generateWordDocument>[0]) {
  const { blob, fileName } = await generateWordDocument(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
