export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function paragraphMatchesHeading(value: string, heading: string | string[]): boolean {
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

export function appendColonIfMissing(paragraphXml: string): string {
  const text = stripTags(paragraphXml).trim();
  if (/:$/.test(text)) return paragraphXml;

  // If heading ends with a dot inside the last <w:t>, replace that dot with a colon
  if (/[.]\s*<\/w:t>/.test(paragraphXml)) {
    return paragraphXml.replace(/[.](\s*<\/w:t>(?![\s\S]*<w:t>))/, ":$1");
  }

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

  const colonRun = `<w:r>${rPr}<w:t>:</w:t></w:r>`;
  return paragraphXml.replace(/<\/w:p>\s*$/, `${colonRun}</w:p>`);
}

/**
 * Extracts the <w:pPr>...</w:pPr> and run <w:rPr>...</w:rPr> from a heading
 * paragraph so inserted content paragraphs reuse the template's Arial +
 * justified formatting. Any bold flag is dropped so body text is not bold.
 */
export function extractParagraphStyles(headingParagraph: string): { pPr: string; rPr: string } {
  const pPrMatch = headingParagraph.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  let pPr = pPrMatch ? pPrMatch[0] : "";
  // The paragraph properties carry an <w:rPr> for the paragraph mark; strip it
  // so we can build a clean run-level rPr from the actual run instead.
  pPr = pPr.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, "").replace(/<w:b\b[^>]*\/>/g, "");

  // Set clean compact paragraph spacing to avoid excessive blank vertical gaps
  const compactSpacing = '<w:spacing w:line="360" w:lineRule="auto" w:before="0" w:after="40" />';
  if (/<w:spacing\b[^>]*\/>/.test(pPr)) {
    pPr = pPr.replace(/<w:spacing\b[^>]*\/>/, compactSpacing);
  } else if (pPr.endsWith("</w:pPr>")) {
    pPr = pPr.replace(/<\/w:pPr>$/, `${compactSpacing}</w:pPr>`);
  } else {
    pPr = `<w:pPr>${compactSpacing}</w:pPr>`;
  }

  // Use Times New Roman font for all runs
  const timesFont = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" />';
  let rPrInner = timesFont;

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
 * <w:bCs/> so the label of title-like lines renders in bold with Times New Roman.
 */
export function makeBoldRPr(rPr: string): string {
  const inner = rPr
    .replace(/^<w:rPr>/, "")
    .replace(/<\/w:rPr>$/, "")
    .replace(/<w:b\b[^>]*\/>/g, "")
    .replace(/<w:bCs\b[^>]*\/>/g, "");
  const timesFont = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" />';
  let withFont = inner;
  if (/<w:rFonts\b[^>]*\/>/.test(withFont)) {
    withFont = withFont.replace(/<w:rFonts\b[^>]*\/>/, timesFont);
  } else {
    withFont = `${timesFont}${withFont}`;
  }
  const boldTags = "<w:b/><w:bCs/>";
  return `<w:rPr>${boldTags}${withFont}</w:rPr>`;
}

export function splitLabel(paragraph: string): { label: string; rest: string } | null {
  const trimmed = paragraph.trim();
  if (!trimmed) return null;

  // Case A: Markdown bold concept/term at start:
  // e.g. **Concepto:** Def, **Concepto**: Def, 1. **Concepto:** Def, - **Concepto:** Def, • **Concepto:** Def
  const boldMatch = trimmed.match(
    /^((?:(?:\d+[.)]|[-*•])\s+)?)\*\*([^*\n]+?)\*\*(?::\s*|\s*:\s*)?(.*)$/
  );
  if (boldMatch) {
    let marker = (boldMatch[1] || "").trim();
    if (marker === "*" || marker === "-") marker = "•";
    const markerPrefix = marker ? `${marker} ` : "";
    let term = boldMatch[2].replace(/\*/g, "").trim();
    if (term.endsWith(":")) {
      term = term.slice(0, -1).trim();
    }
    const rest = (boldMatch[3] || "").replace(/^[*:\s]+/, "").trim();
    return {
      label: `${markerPrefix}${term}:`.replace(/\*/g, ""),
      rest,
    };
  }

  // Case B: Plain colon label: e.g. "Concepto: Def", "• Concepto: Def", "1. Concepto: Def"
  const colonIndex = trimmed.indexOf(":");
  if (colonIndex !== -1) {
    let rawLabel = trimmed.slice(0, colonIndex).trim();
    if (/^[*]\s+/.test(rawLabel)) {
      rawLabel = rawLabel.replace(/^[*]\s+/, "• ");
    }
    const labelWithoutMarker = rawLabel.replace(/^(?:\d+[.)]|[-*•])\s+/, "").replace(/\*/g, "").trim();
    if (
      labelWithoutMarker.length > 0 &&
      labelWithoutMarker.length <= 70 &&
      labelWithoutMarker.split(/\s+/).length <= 10 &&
      !/[?!]/.test(labelWithoutMarker) &&
      !/[.]{2,}/.test(labelWithoutMarker)
    ) {
      const rest = trimmed.slice(colonIndex + 1).replace(/^[*:\s]+/, "").trim();
      const cleanRawLabel = rawLabel.replace(/\*/g, "").trim();
      return {
        label: `${cleanRawLabel}:`.replace(/\*/g, ""),
        rest,
      };
    }
  }

  return null;
}

export function splitLabelOrListMarker(paragraph: string): { label: string; rest: string } | null {
  const label = splitLabel(paragraph);
  if (label) {
    return label;
  }

  const match = paragraph.match(/^\s*(\d+[.)]|[-*•])\s+(.*)$/);
  if (!match) {
    return null;
  }

  let marker = match[1];
  if (marker === "*" || marker === "-") {
    marker = "•";
  }

  return {
    label: marker.replace(/\*/g, ""),
    rest: match[2].replace(/^[*:\s]+/, "").trim(),
  };
}

export function formatRunsXml(text: string, rPr: string, boldRPr: string): string {
  if (!text) return "";

  const parts = text.split(/(\*\*.*?\*\*)/g);
  let xml = "";

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      const content = part.slice(2, -2).replace(/\*/g, "");
      xml += `<w:r>${boldRPr}<w:t xml:space="preserve">${escapeXml(content)}</w:t></w:r>`;
    } else {
      const content = part.replace(/\*/g, "");
      xml += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(content)}</w:t></w:r>`;
    }
  }

  return xml;
}

export function isBibliographyHeading(heading: string | string[]): boolean {
  const headings = Array.isArray(heading) ? heading : [heading];
  return headings.some((candidate) => {
    const norm = normalizeText(candidate);
    return (
      norm.includes("bibliografia") ||
      norm.includes("referencias") ||
      norm.includes("fuentes consultadas")
    );
  });
}

export function buildParagraphsXml(
  text: string,
  styles?: { pPr: string; rPr: string },
  options?: { isBibliography?: boolean }
): string {
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
  const isBibliography = options?.isBibliography ?? false;

  return paragraphs
    .map((paragraph) => {
      if (isBibliography) {
        // En la bibliografía: SIN enumeraciones, SIN viñetas y SIN NINGUNA palabra en negrilla.
        const cleanBib = paragraph
          .replace(/^(?:\[\d+\]|\d+[.)]|\d+\s*[-–—]\s*|[-•*])\s*/u, "")
          .replace(/\*/g, "")
          .replace(/__/g, "")
          .trim();
        return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(cleanBib)}</w:t></w:r></w:p>`;
      }

      const label = splitLabelOrListMarker(paragraph);
      if (label) {
        const cleanLabel = label.label.replace(/\*/g, "");
        const boldRun = `<w:r>${boldRPr}<w:t xml:space="preserve">${escapeXml(cleanLabel)}</w:t></w:r>`;
        const restRuns = label.rest ? formatRunsXml(` ${label.rest}`, rPr, boldRPr) : "";
        return `<w:p>${pPr}${boldRun}${restRuns}</w:p>`;
      }

      return `<w:p>${pPr}${formatRunsXml(paragraph, rPr, boldRPr)}</w:p>`;
    })
    .join("");
}

/**
 * Inserts the given content paragraphs INSIDE the cell, right after the
 * heading paragraph. Never emits paragraphs outside </w:tc> (which would be
 * invalid OOXML). The inserted paragraphs reuse the heading paragraph's
 * formatting (Arial + justified) so they match the template.
 */
export function insertContentInCell(cellXml: string, heading: string | string[], rawContent: string): string {
  const content = (rawContent ?? "").trim();
  if (!content) {
    return cellXml;
  }

  const paragraphRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let injected = false;
  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = paragraphRegex.exec(cellXml)) !== null) {
    const paragraph = match[0];
    const start = match.index;
    if (start > lastIndex) {
      parts.push(cellXml.slice(lastIndex, start));
    }

    if (!injected && paragraphMatchesHeading(stripTags(paragraph), heading)) {
      injected = true;
      const paragraphWithColon = appendColonIfMissing(paragraph);
      const styles = extractParagraphStyles(paragraphWithColon);
      const isBib = isBibliographyHeading(heading) || isBibliographyHeading(stripTags(paragraph));
      parts.push(paragraphWithColon + buildParagraphsXml(content, styles, { isBibliography: isBib }));
    } else {
      // Discard empty template paragraphs that follow after content injection
      const isEmpty = stripTags(paragraph).trim().length === 0;
      if (!injected || !isEmpty) {
        parts.push(paragraph);
      }
    }

    lastIndex = paragraphRegex.lastIndex;
  }

  if (!injected) {
    return cellXml;
  }

  if (lastIndex < cellXml.length) parts.push(cellXml.slice(lastIndex));

  return parts.join("");
}
