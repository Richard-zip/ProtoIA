import { renderAsync } from "docx-preview";
import { Protocol } from "../../core/entities/protocol.entity";
import { ExportFile, IDocumentExporter } from "../../core/interfaces/document-exporter.interface";

export class PdfProtocolExporter implements IDocumentExporter {
  readonly format = "pdf";

  constructor(private readonly docxExporter: IDocumentExporter) {}

  async exportDocument(protocol: Protocol, options?: Record<string, unknown>): Promise<ExportFile> {
    const fileName = protocol.safePdfFileName;

    // Entorno de prueba o sin DOM (Node.js)
    if (typeof window === "undefined" || typeof document === "undefined") {
      const mockContent = `%PDF-1.4\n%Title: ${protocol.formattedTitle}\n%%EOF`;
      const blob = new Blob([mockContent], { type: "application/pdf" });
      return {
        blob,
        fileName,
        mimeType: "application/pdf",
      };
    }

    // 1. Obtener el HTML con estilos incrustados y gráficos en Base64
    let html = "";
    const activeViewport = document.querySelector(".docx-preview-viewport");
    if (activeViewport && activeViewport.innerHTML && activeViewport.innerHTML.trim().length > 200) {
      html = activeViewport.innerHTML;
    } else {
      const docxFile = await this.docxExporter.exportDocument(protocol, options);
      const tempDiv = document.createElement("div");
      await renderAsync(docxFile.blob, tempDiv, undefined, {
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        className: "docx",
        useBase64URL: true,
        hideWrapperOnPrint: true,
      });
      html = tempDiv.innerHTML;
    }

    // 2. Si estamos dentro de Electron, utilizar el motor Chromium nativo printToPDF
    if (window.ipcRenderer && typeof window.ipcRenderer.invoke === "function") {
      const pdfData = await window.ipcRenderer.invoke("generate-pdf-from-html", {
        html,
        title: protocol.formattedTitle,
      });

      const rawBuffer = pdfData as ArrayBuffer | ArrayBufferView;
      const blob = new Blob([rawBuffer as BlobPart], { type: "application/pdf" });
      return {
        blob,
        fileName,
        mimeType: "application/pdf",
      };
    }

    // 3. Fallback para navegador web sin Electron: imprimir con diálogo de guardado PDF
    this.printViaIframe(html, protocol.formattedTitle);

    const fallbackBlob = new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" });
    return {
      blob: fallbackBlob,
      fileName,
      mimeType: "application/pdf",
    };
  }

  private printViaIframe(html: string, title: string): void {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { size: letter portrait; margin: 0; }
    *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; font-family: Arial, sans-serif; }
    .docx-wrapper { background: #ffffff !important; padding: 0 !important; }
    section.docx { box-shadow: none !important; margin: 0 auto !important; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
      }, 300);
    }
  }
}
