import React from "react";
import { Protocol } from "../../core/entities/protocol.entity";
import { IProtocolStrategy } from "../../core/interfaces/protocol-strategy.interface";
import { IDocumentExporter } from "../../core/interfaces/document-exporter.interface";
import { DocxPreview } from "./DocxPreview";

interface ProtocolPreviewProps {
  materia: string;
  activeStrategy: IProtocolStrategy;
  temasCount: number;
  participantesCount: number;
  protocol: Protocol | null;
  loading: boolean;
  exportingWord?: boolean;
  errorMessage: string | null;
  documentExporter?: IDocumentExporter;
  onRetry?: () => void;
  onExportWord?: () => void;
  onRequestConfig?: () => void;
  children?: React.ReactNode;
}

export const ProtocolPreview: React.FC<ProtocolPreviewProps> = ({
  materia,
  activeStrategy,
  temasCount,
  participantesCount,
  protocol,
  loading,
  exportingWord = false,
  errorMessage,
  documentExporter,
  onRetry,
  onExportWord,
  onRequestConfig,
  children,
}) => {
  return (
    <section className="panel panel-preview" aria-labelledby="preview-heading">
      <div className="panel-header preview-toolbar">
        <div className="panel-header-info">
          <h2 id="preview-heading">{materia.trim() || "Documento Académico"}</h2>
          <div className="preview-header-meta">
            <span className="preview-badge accent">{activeStrategy.label}</span>
            <span className="preview-badge">{temasCount} {temasCount === 1 ? "tema" : "temas"}</span>
            {activeStrategy.requiresParticipants && (
              <span className="preview-badge">{participantesCount} {participantesCount === 1 ? "integrante" : "integrantes"}</span>
            )}
          </div>
        </div>

        <div className="preview-toolbar-actions">
          {protocol && protocol.sections.length > 0 && !loading && onExportWord && (
            <button
              type="button"
              className="download-word-btn"
              onClick={onExportWord}
              disabled={exportingWord}
              title="Descargar documento Word (.docx)"
            >
              {exportingWord ? (
                <>
                  <svg className="spinner-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>Exportando Word...</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M12 18v-6" />
                    <path d="m9 15 3 3 3-3" />
                  </svg>
                  <span>Descargar Word (.docx)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {errorMessage && (() => {
        const isHighDemand =
          errorMessage.toLowerCase().includes("alta demanda") ||
          errorMessage.toLowerCase().includes("servidores de google") ||
          errorMessage.includes("503");

        return (
          <div className={`error-banner ${isHighDemand ? "high-demand" : "standard"}`} role="alert">
            {isHighDemand ? (
              <svg className="error-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                <line x1="12" y1="11" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg className="error-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}

            <div className="error-banner-content">
              <div className="error-banner-title">
                <span>{isHighDemand ? "Servidores de Google en alta demanda" : "Aviso de generación"}</span>
                {isHighDemand && <span className="error-banner-badge">Servicio Externo</span>}
              </div>

              <p className="error-banner-message">{errorMessage}</p>

              {onRequestConfig && errorMessage.toLowerCase().includes("api key") ? (
                <div className="error-banner-action">
                  <button
                    type="button"
                    className="error-retry-btn"
                    onClick={onRequestConfig}
                    title="Configurar tu API Key de Google Gemini"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Configurar API Key</span>
                  </button>
                </div>
              ) : onRetry ? (
                <div className="error-banner-action">
                  <button
                    type="button"
                    className="error-retry-btn"
                    onClick={onRetry}
                    disabled={loading}
                    title="Reintentar generación con el motor de IA"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    <span>Reintentar ahora</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="state-container">
          <svg className="spinner-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <div className="skeleton-wrapper">
            <div className="skeleton-line title" style={{ margin: "0 auto" }} />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" style={{ margin: "0 auto" }} />
          </div>
          <p className="state-desc">
            El motor de IA está redactando y estructurando las secciones académicas del protocolo.
          </p>
        </div>
      ) : protocol && protocol.sections.length > 0 ? (
        documentExporter ? (
          <DocxPreview protocol={protocol} documentExporter={documentExporter} />
        ) : (
          <div className="document-sheet">
            <header className="document-institutional-header">
              <h3 className="document-institution-title">Protocolo Académico de Aprendizaje</h3>
              <p className="document-faculty-title">Estructura Curricular de Síntesis</p>
            </header>

            <div className="document-meta-grid">
              <div className="document-meta-item">
                <span className="document-meta-label">Asignatura</span>
                <span className="document-meta-val">{materia.trim() || "Sin registrar"}</span>
              </div>
              <div className="document-meta-item">
                <span className="document-meta-label">Tipo de protocolo</span>
                <span className="document-meta-val">{activeStrategy.label}</span>
              </div>
              {activeStrategy.requiresParticipants && (
                <div className="document-meta-item">
                  <span className="document-meta-label">Integrantes</span>
                  <span className="document-meta-val">
                    {participantesCount > 0 ? `${participantesCount} participantes` : "Individual"}
                  </span>
                </div>
              )}
              <div className="document-meta-item">
                <span className="document-meta-label">Fecha</span>
                <span className="document-meta-val">
                  {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
            </div>

            {protocol.sections.map((section, index) => (
              <article key={`${section.title}-${index}`} className="protocol-section">
                <header className="protocol-section-header">
                  <span className="protocol-section-number">{String(index + 1).padStart(2, "0")}</span>
                  <h4 className="protocol-section-title">{section.title}</h4>
                </header>
                <div className="protocol-section-body">
                  {section.body.map((paragraph, paragraphIndex) => {
                    const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={`${paragraphIndex}-${paragraph.substring(0, 15)}`}>
                        {parts.map((part, partIdx) => {
                          if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
                            return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )
      ) : (
        <div className="state-container">
          <div className="state-icon-circle" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 className="state-title">Vista previa del protocolo</h3>
          <p className="state-desc">
            Completa la materia y los temas en el panel izquierdo y haz clic en <strong>Generar protocolo</strong> para ver aquí el documento institucional redactado.
          </p>
        </div>
      )}

      {children}
    </section>
  );
};

