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

    let templateBuffer: ArrayBuffer | null = null;

    // 1. Prioridad: Carga mediante canal IPC nativo en Electron (100% compatible con AppImage y app.asar)
    if (typeof window !== "undefined" && window.electronAPI?.loadTemplate) {
      try {
        const result = await window.electronAPI.loadTemplate(resolvedTemplatePath);
        if (result.success && result.bufferBase64) {
          const binaryString = atob(result.bufferBase64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          templateBuffer = bytes.buffer;
        }
      } catch (ipcErr) {
        console.warn("[DocxProtocolExporter] Falló carga IPC, probando fallback web:", ipcErr);
      }
    }

    // 2. Fallback: Carga web mediante fetch relativo seguro (resuelve relativo a la app)
    if (!templateBuffer) {
      const cleanPath = resolvedTemplatePath.replace(/^\/+/, "");
      const candidates = [
        cleanPath,
        `./${cleanPath}`,
        resolvedTemplatePath,
      ];
      if (!cleanPath.includes("templates/")) {
        candidates.unshift(`templates/${cleanPath}`, `./templates/${cleanPath}`);
      }

      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate);
          if (response.ok) {
            templateBuffer = await response.arrayBuffer();
            break;
          }
        } catch {
          // Continuar con siguiente candidato
        }
      }
    }

    if (!templateBuffer) {
      throw new Error(`No se pudo cargar la plantilla de Word institucional ("${resolvedTemplatePath}").`);
    }
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

    // 1. Eliminar cualquier párrafo sobrante después de la tabla principal y sustituirlo
    // por un único párrafo de 1pt con margen cero, para evitar que se cree una página en blanco al final.
    updatedXml = updatedXml.replace(
      /<\/w:tbl>[\s\S]*?<w:sectPr\b/g,
      '</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p><w:sectPr'
    );
    updatedXml = updatedXml.replace(/<w:type\s+w:val="nextPage"\s*\/>/g, '<w:type w:val="continuous"/>');

    // 2. Garantizar que la tipografía del documento sea Times New Roman
    updatedXml = updatedXml
      .replace(/w:ascii="(?!Times New Roman)[^"]*"/g, 'w:ascii="Times New Roman"')
      .replace(/w:hAnsi="(?!Times New Roman)[^"]*"/g, 'w:hAnsi="Times New Roman"')
      .replace(/w:cs="(?!Times New Roman)[^"]*"/g, 'w:cs="Times New Roman"');
    zip.file(documentPath, updatedXml);

    const stylesPath = "word/styles.xml";
    const stylesXml = await zip.file(stylesPath)?.async("string");
    if (stylesXml) {
      const updatedStylesXml = stylesXml
        .replace(/w:ascii="(?!Times New Roman)[^"]*"/g, 'w:ascii="Times New Roman"')
        .replace(/w:hAnsi="(?!Times New Roman)[^"]*"/g, 'w:hAnsi="Times New Roman"')
        .replace(/w:cs="(?!Times New Roman)[^"]*"/g, 'w:cs="Times New Roman"');
      zip.file(stylesPath, updatedStylesXml);
    }

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
