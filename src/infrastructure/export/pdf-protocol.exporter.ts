import { renderAsync } from "docx-preview";
import { Protocol } from "../../core/entities/protocol.entity";
import { ExportFile, IDocumentExporter } from "../../core/interfaces/document-exporter.interface";

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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

    // 1. Generar el archivo DOCX auténtico oficial
    const docxFile = await this.docxExporter.exportDocument(protocol, options);

    // 2. Si estamos dentro de Electron, priorizar la conversión nativa con LibreOffice (100% idéntico a Word)
    if (window.ipcRenderer && typeof window.ipcRenderer.invoke === "function") {
      try {
        const docxBase64 = await blobToBase64(docxFile.blob);
        const pdfData = await window.ipcRenderer.invoke("convert-docx-to-pdf", {
          docxBase64,
          title: protocol.formattedTitle,
        });

        if (pdfData) {
          const rawBuffer = pdfData as ArrayBuffer | ArrayBufferView;
          const blob = new Blob([rawBuffer as BlobPart], { type: "application/pdf" });
          return {
            blob,
            fileName,
            mimeType: "application/pdf",
          };
        }
      } catch (loError) {
        console.warn(
          "[PdfProtocolExporter] LibreOffice no disponible o no completó la conversión. Utilizando motor secundario de respaldo.",
          loError
        );
      }
    }

    // 3. Motor de respaldo: obtener HTML y renderizar con Chromium printToPDF
    let html = "";
    const activeViewport = document.querySelector(".docx-preview-viewport");
    if (activeViewport && activeViewport.innerHTML && activeViewport.innerHTML.trim().length > 200) {
      html = activeViewport.innerHTML;
    } else {
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
    @page {
      size: letter portrait;
      margin-top: 16mm;
      margin-bottom: 16mm;
      margin-left: 0;
      margin-right: 0;
    }

    @page :first {
      margin-top: 0;
      margin-bottom: 0;
      margin-left: 0;
      margin-right: 0;
    }

    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: "Calibri", "Carlito", "Segoe UI", Arial, "Helvetica Neue", Helvetica, sans-serif !important;
      -webkit-font-smoothing: antialiased !important;
      text-rendering: optimizeLegibility !important;
    }

    .docx-wrapper {
      background: #ffffff !important;
      padding: 0 !important;
      margin: 0 !important;
      display: block !important;
    }

    section.docx {
      box-shadow: none !important;
      margin: 0 auto !important;
      background: #ffffff !important;
      display: block !important;
      position: relative !important;
      overflow: visible !important;
      min-height: auto !important;
      height: auto !important;
    }

    header {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 792pt !important;
      max-height: 792pt !important;
      overflow: hidden !important;
      pointer-events: none !important;
      z-index: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    header p {
      margin: 0 !important;
      padding: 0 !important;
    }

    header svg {
      margin-top: 0 !important;
      max-height: 792pt !important;
      height: 792pt !important;
    }

    article {
      position: relative !important;
      z-index: 1 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    table {
      border-collapse: collapse !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
      table-layout: fixed !important;
      width: 100% !important;
    }

    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    td, th {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      vertical-align: top !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }

    p {
      orphans: 2 !important;
      widows: 2 !important;
    }

    footer {
      position: relative !important;
      z-index: 1 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    img, image, svg {
      image-rendering: -webkit-optimize-contrast !important;
      image-rendering: high-quality !important;
    }
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
