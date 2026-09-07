import React, { useMemo } from "react";
import { IProtocolStrategy } from "../../core/interfaces/protocol-strategy.interface";

interface ProtocolFormProps {
  materia: string;
  onMateriaChange: (value: string) => void;
  temasTexto: string;
  onTemasTextoChange: (value: string) => void;
  participantes: string[];
  onActualizarParticipante: (index: number, value: string) => void;
  onAgregarParticipante: () => void;
  onEliminarParticipante: (index: number) => void;
  tipo: string;
  onTipoChange: (tipo: string) => void;
  availableStrategies: IProtocolStrategy[];
  activeStrategy: IProtocolStrategy;
  loading: boolean;
  onGenerate: () => void;
}

export const ProtocolForm: React.FC<ProtocolFormProps> = ({
  materia,
  onMateriaChange,
  temasTexto,
  onTemasTextoChange,
  participantes,
  onActualizarParticipante,
  onAgregarParticipante,
  onEliminarParticipante,
  tipo,
  onTipoChange,
  availableStrategies,
  activeStrategy,
  loading,
  onGenerate,
}) => {
  const temasCount = useMemo(() => {
    return temasTexto
      .split(/\r?\n+/)
      .map((t) => t.replace(/^[•*-]\s*/, "").trim())
      .filter(Boolean).length;
  }, [temasTexto]);

  return (
    <section className="panel panel-form" aria-labelledby="form-heading">
      <div className="panel-header">
        <div className="panel-header-info">
          <h2 id="form-heading">Configuración del Protocolo</h2>
          <p>Ingresa los datos para estructurar y redactar el protocolo académico.</p>
        </div>
      </div>

      {/* Selector de estrategia / tipo de protocolo */}
      <div className="strategy-switcher">
        <span className="strategy-switcher-label">Tipo de protocolo</span>
        <div className="segmented-control" role="radiogroup" aria-label="Tipo de protocolo">
          {availableStrategies.map((strategy) => {
            const isActive = tipo === strategy.id;
            return (
              <label
                key={strategy.id}
                className={`segmented-option ${isActive ? "active" : ""}`}
              >
                <input
                  type="radio"
                  name="protocol-type"
                  value={strategy.id}
                  checked={isActive}
                  onChange={() => onTipoChange(strategy.id)}
                />
                {strategy.id === "individual" ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                )}
                <span>{strategy.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Campo Asignatura */}
      <div className="field">
        <div className="field-header">
          <label htmlFor="input-materia" className="field-label">
            Asignatura o Materia
          </label>
        </div>
        <input
          id="input-materia"
          className="field-input"
          value={materia}
          onChange={(e) => onMateriaChange(e.target.value)}
          placeholder="Ej. Ingeniería de Software, Metodología..."
          autoComplete="off"
        />
      </div>

      {/* Campo Temas */}
      <div className="field">
        <div className="field-header">
          <label htmlFor="textarea-temas" className="field-label">
            Temas de Aprendizaje
          </label>
          {temasCount > 0 && (
            <span className="field-badge">{temasCount} {temasCount === 1 ? "tema" : "temas"}</span>
          )}
        </div>
        <textarea
          id="textarea-temas"
          className="field-textarea"
          value={temasTexto}
          onChange={(e) => onTemasTextoChange(e.target.value)}
          placeholder="Escribe los temas tratados (uno por línea o como texto corrido)..."
          rows={5}
        />
        <p className="field-hint">
          Puedes pegar viñetas o texto continuo; la IA estructurará cada unidad académica.
        </p>
      </div>

      {/* Participantes (Solo si la estrategia lo requiere) */}
      {activeStrategy.requiresParticipants && (
        <div className="participants-section">
          <div className="participants-header">
            <span className="field-label">
              Integrantes del CIPAS / Grupo
            </span>
            <button
              type="button"
              className="add-participant-button"
              onClick={onAgregarParticipante}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Añadir integrante</span>
            </button>
          </div>

          <div className="participants-list">
            {participantes.map((participante, index) => (
              <div key={index} className="participant-item">
                <span className="participant-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <input
                  className="field-input"
                  value={participante}
                  onChange={(e) => onActualizarParticipante(index, e.target.value)}
                  placeholder={`Nombre del estudiante ${index + 1}`}
                />
                {participantes.length > 1 && (
                  <button
                    type="button"
                    className="icon-delete-button"
                    onClick={() => onEliminarParticipante(index)}
                    title="Eliminar integrante"
                    aria-label={`Eliminar integrante ${index + 1}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones de acción principal */}
      <div className="actions-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onGenerate}
          disabled={loading || !materia.trim()}
        >
          {loading ? (
            <>
              <svg className="spinner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <span>Redactando con IA...</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
              </svg>
              <span>Generar protocolo</span>
            </>
          )}
        </button>
      </div>

      <p className="form-disclaimer-note">
        Agnes AI puede cometer errores. Es importante que revises la información generada.
      </p>
    </section>
  );
};

