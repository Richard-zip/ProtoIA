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
export function extractParagraphStyles(headingParagraph: string): { pPr: string; rPr: string } {
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
export function makeBoldRPr(rPr: string): string {
  const inner = rPr
    .replace(/^<w:rPr>/, "")
    .replace(/<\/w:rPr>$/, "")
    .replace(/<w:b\b[^>]*\/>/g, "")
    .replace(/<w:bCs\b[^>]*\/>/g, "");
  const rFontsMatch = inner.match(/<w:rFonts\b[^>]*\/>/);
  const boldTags = "<w:b/><w:bCs/>";
  const withBold = rFontsMatch
    ? inner.replace(rFontsMatch[0], `${rFontsMatch[0]}${boldTags}`)
    : `${boldTags}${inner}`;
  return `<w:rPr>${withBold}</w:rPr>`;
}

export function splitLabel(paragraph: string): { label: string; rest: string } | null {
  const colonIndex = paragraph.indexOf(":");
  if (colonIndex === -1) {
    return null;
  }

  const label = paragraph.slice(0, colonIndex).trim();
  if (label.length === 0 || label.length > 60 || /[.!?]/.test(label)) {
    return null;
  }

  const rest = paragraph.slice(colonIndex + 1).trim();
  return { label, rest };
}

export function splitLabelOrListMarker(paragraph: string): { label: string; rest: string } | null {
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

export function buildParagraphsXml(text: string, styles?: { pPr: string; rPr: string }): string {
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
      parts.push(paragraphWithColon + buildParagraphsXml(content, styles));
    } else {
      parts.push(paragraph);
    }

    lastIndex = paragraphRegex.lastIndex;
  }

  if (!injected) {
    return cellXml;
  }

  if (lastIndex < cellXml.length) parts.push(cellXml.slice(lastIndex));

  return parts.join("");
}
