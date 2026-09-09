import React, { useEffect, useRef, useState, useCallback } from "react";
import { Protocol } from "../../core/entities/protocol.entity";
import { IDocumentExporter } from "../../core/interfaces/document-exporter.interface";

interface DocxPreviewProps {
  protocol: Protocol;
  documentExporter: IDocumentExporter;
}

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

export const DocxPreview: React.FC<DocxPreviewProps> = ({ protocol, documentExporter }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<string>("Iniciando...");
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(100);

  const handleZoomIn = () => setZoom((prev) => Math.min(150, prev + 10));
  const handleZoomOut = () => setZoom((prev) => Math.max(50, prev - 10));
  const handleZoomReset = () => setZoom(100);

  const handleFitWidth = useCallback(() => {
    if (!scrollAreaRef.current) return;
    const availableWidth = scrollAreaRef.current.clientWidth - 56;
    const sheetBaseWidth = 816; // 8.5in estándar a 96 DPI
    if (availableWidth > 0 && availableWidth < sheetBaseWidth) {
      const calculated = Math.max(50, Math.floor((availableWidth / sheetBaseWidth) * 100));
      setZoom(calculated);
    } else {
      setZoom(100);
    }
  }, []);

  const renderWithLibreOffice = useCallback(
    async (docxBlob: Blob): Promise<boolean> => {
      if (!window.electronAPI?.renderProtocolPages) {
        return false;
      }

      setLoadingStep("Compilando documento con motor oficial LibreOffice...");
      const docxBase64 = await blobToBase64(docxBlob);

      const result = await window.electronAPI.renderProtocolPages({ docxBase64 });
      if (!result.success) {
        console.warn("[DocxPreview] LibreOffice no pudo renderizar:", result.error);
        return false;
      }

      // 1. Si pdftoppm generó imágenes de página directamente
      if (result.pageImages && result.pageImages.length > 0) {
        setPages(result.pageImages);
        return true;
      }

      // 2. Fallback con pdfjs-dist si solo se recibió pdfBase64
      if (result.pdfBase64) {
        setLoadingStep("Rasterizando páginas de alta fidelidad...");
        try {
          const pdfjsLib = await import("pdfjs-dist");
          const binaryString = atob(result.pdfBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const loadingTask = pdfjsLib.getDocument({ data: bytes });
          const pdfDoc = await loadingTask.promise;
          const renderedPages: string[] = [];

          for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.75 }); // Alta resolución
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport }).promise;
              renderedPages.push(canvas.toDataURL("image/png"));
            }
          }

          if (renderedPages.length > 0) {
            setPages(renderedPages);
            return true;
          }
        } catch (pdfErr) {
          console.warn("[DocxPreview] Fallback pdfjs-dist falló:", pdfErr);
        }
      }

      return false;
    },
    []
  );

  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setLoadingStep("Preparando datos de la plantilla institucional...");
      const exportFile = await documentExporter.exportDocument(protocol);

      const success = await renderWithLibreOffice(exportFile.blob);
      if (!success) {
        throw new Error(
          "El motor LibreOffice no pudo compilar las páginas del protocolo. Por favor verifica la disponibilidad del motor y haz clic en reintentar."
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`No se pudo generar la vista previa: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [protocol, documentExporter, renderWithLibreOffice]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument, retryKey]);

  return (
    <div className="docx-preview-root">
      {!loading && !error && (
        <div className="docx-preview-toolbar" role="toolbar" aria-label="Controles de vista previa">
          <div className="docx-preview-toolbar-left">
            <div className="docx-preview-badge-status">
              <span className="lo-engine-pill">LibreOffice Oficial</span>
              <span>
                {pages.length} {pages.length === 1 ? "página oficial" : "páginas oficiales"} (idéntico a Word y PDF)
              </span>
            </div>
          </div>

          <div className="docx-preview-zoom-controls">
            <button
              type="button"
              className="docx-zoom-btn"
              onClick={handleZoomOut}
              title="Reducir zoom"
              aria-label="Reducir zoom"
              disabled={zoom <= 50}
            >
              −
            </button>
            <span
              className="docx-zoom-level"
              onClick={handleZoomReset}
              title="Restablecer zoom al 100%"
            >
              {zoom}%
            </span>
            <button
              type="button"
              className="docx-zoom-btn"
              onClick={handleZoomIn}
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
              disabled={zoom >= 150}
            >
              +
            </button>
            <button
              type="button"
              className="docx-zoom-fit-btn"
              onClick={handleFitWidth}
              title="Ajustar ancho del documento a la pantalla"
            >
              Ajustar
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="docx-preview-loading" role="status">
          <svg className="spinner-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5">
            <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
            <path d="M12 3a9 9 0 0 1 9 9" />
          </svg>
          <div className="docx-preview-loading-text">
            <span>{loadingStep}</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="docx-preview-error">
          <p>{error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setRetryKey((k) => k + 1)}
          >
            Reintentar visualización
          </button>
        </div>
      )}

      {/* Contenedor de visualización de páginas oficiales */}
      <div
        ref={scrollAreaRef}
        className={`docx-preview-viewport ${loading ? "is-loading" : ""}`}
        style={{
          "--docx-zoom": `${zoom / 100}`,
          "--sheet-zoom": `${zoom / 100}`,
        } as React.CSSProperties}
      >
        {pages.length > 0 && !loading && (
          <div className="protocol-pages-flow">
            {pages.map((pageSrc, pageIdx) => (
              <div
                key={pageIdx}
                className="protocol-paper-sheet"
                data-page-index={pageIdx + 1}
              >
                <div className="protocol-paper-sheet-badge">
                  <span className="protocol-sheet-page-label">
                    Página {pageIdx + 1} de {pages.length}
                  </span>
                  <span className="protocol-sheet-doc-type">Formato Carta • Oficial</span>
                </div>
                <img
                  src={pageSrc}
                  alt={`Página ${pageIdx + 1} del protocolo oficial`}
                  className="protocol-sheet-image"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


