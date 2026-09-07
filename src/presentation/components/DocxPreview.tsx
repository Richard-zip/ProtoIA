import React, { useEffect, useRef, useState, useCallback } from "react";
import { renderAsync } from "docx-preview";
import { Protocol } from "../../core/entities/protocol.entity";
import { IDocumentExporter } from "../../core/interfaces/document-exporter.interface";

interface DocxPreviewProps {
  protocol: Protocol;
  documentExporter: IDocumentExporter;
}

export const DocxPreview: React.FC<DocxPreviewProps> = ({ protocol, documentExporter }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);

  const renderDocx = useCallback(async () => {
    if (!containerRef.current) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Generate the actual DOCX blob with the template populated
      const exportFile = await documentExporter.exportDocument(protocol);

      // 2. Render asynchronously with docx-preview
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        await renderAsync(exportFile.blob, containerRef.current, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          className: "docx",
          useBase64URL: true,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`No se pudo generar la vista previa de Word: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [protocol, documentExporter]);

  useEffect(() => {
    renderDocx();
  }, [renderDocx, retryKey]);

  return (
    <div className="docx-preview-root">
      {loading && (
        <div className="docx-preview-loading" role="status">
          <svg className="spinner-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5">
            <circle cx="12" cy="10" r="8" strokeOpacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <div className="docx-preview-loading-text">
            <span>Renderizando documento con <strong>docx-preview</strong>...</span>
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

      <div
        ref={containerRef}
        className={`docx-preview-viewport ${loading ? "is-loading" : ""}`}
      />
    </div>
  );
};
