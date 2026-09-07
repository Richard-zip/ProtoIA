import JSZip from "jszip";
import { Protocol } from "../../core/entities/protocol.entity";
import { ExportFile, IDocumentExporter } from "../../core/interfaces/document-exporter.interface";
import { IProtocolRegistry } from "../../core/strategies/protocol-strategy.registry";
import { insertContentInCell } from "./helpers/docx-xml.helper";

export class DocxProtocolExporter implements IDocumentExporter {
  readonly format = "docx";

  constructor(private readonly protocolRegistry: IProtocolRegistry) {}

  async exportDocument(protocol: Protocol, options?: Record<string, unknown>): Promise<ExportFile> {
    const strategy = this.protocolRegistry.get(protocol.metadata.tipo);
    const resolvedTemplatePath =
      (options?.templatePath as string | undefined) || strategy.templatePath;

    let response = await fetch(resolvedTemplatePath);
    if (!response.ok && !resolvedTemplatePath.includes("/templates/")) {
      const fallbackPath = `/templates${resolvedTemplatePath.startsWith("/") ? "" : "/"}${resolvedTemplatePath}`;
      const fallbackResponse = await fetch(fallbackPath);
      if (fallbackResponse.ok) {
        response = fallbackResponse;
      }
    }
    if (!response.ok) {
      throw new Error(`No se pudo cargar la plantilla de Word desde "${resolvedTemplatePath}"`);
    }

    const templateBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(templateBuffer);
    const documentPath = "word/document.xml";
    const documentXml = await zip.file(documentPath)?.async("string");

    if (!documentXml) {
      throw new Error("La plantilla de Word no contiene el documento principal ('word/document.xml')");
    }

    const templateTargets = strategy.getTemplateTargets(protocol.extractedFields);

    let updatedXml = documentXml;
    const cellRegex = /<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g;
    let match: RegExpExecArray | null;
    const newXmlParts: string[] = [];
    let lastIndex = 0;
    const used = new Set<number>();

    while ((match = cellRegex.exec(updatedXml)) !== null) {
      const cell = match[0];
      const start = match.index;
      if (start > lastIndex) {
        newXmlParts.push(updatedXml.slice(lastIndex, start));
      }

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

    if (lastIndex < updatedXml.length) {
      newXmlParts.push(updatedXml.slice(lastIndex));
    }

    updatedXml = newXmlParts.join("");
    zip.file(documentPath, updatedXml);

    const blob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    return {
      blob,
      fileName: protocol.safeFileName,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
}
