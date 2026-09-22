import React, { useState, useEffect } from "react";
import bocchiChair from "../../assets/bocchi/bocchi-chair.gif";

interface BocchiLoadingProps {
  onStop?: () => void;
}

const LOADING_MESSAGES = [
  "Agnes está afinando la redacción de tu protocolo...",
  "Estructurando argumentos académicos con rigor y claridad...",
  "Sintetizando ideas y referencias bibliográficas en formato APA...",
  "Organizando las secciones curriculares del documento...",
  "¡Solo unos instantes más! El protocolo está tomando forma...",
];

export const BocchiLoading: React.FC<BocchiLoadingProps> = ({ onStop }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotar mensajes dinámicamente cada 3.6 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bocchi-loading-container" role="status" aria-live="polite">
      {/* Marco de estilo retro/pixel */}
      <div className="bocchi-pixel-card">
        {/* Adorno sutil de cubos pixel (cian y amarillo) */}
        <div className="bocchi-cubes-ornament" title="Agnes AI">
          <span className="cube cube-cyan" />
          <span className="cube cube-yellow" />
        </div>

        {/* Escena animada pixelada de Bocchi en la silla */}
        <div className="bocchi-scene">
          <img
            src={bocchiChair}
            alt="Animación pixel art en la silla"
            className="bocchi-pixel-gif"
          />
        </div>

        {/* Ecualizador animado */}
        <div className="bocchi-equalizer" aria-hidden="true">
          <span className="eq-bar bar-1" />
          <span className="eq-bar bar-2" />
          <span className="eq-bar bar-3" />
          <span className="eq-bar bar-4" />
          <span className="eq-bar bar-5" />
          <span className="eq-bar bar-6" />
          <span className="eq-bar bar-7" />
        </div>

        {/* Texto de estado dinámico */}
        <div className="bocchi-caption-wrap">
          <p className="bocchi-main-title">Redactando protocolo académico</p>
          <p className="bocchi-dynamic-message">{LOADING_MESSAGES[messageIndex]}</p>
        </div>

        {/* Botón para detener generación */}
        {onStop && (
          <div className="bocchi-stop-wrapper">
            <button
              type="button"
              className="btn btn-stop bocchi-stop-btn"
              onClick={onStop}
              title="Detener la generación del protocolo"
              aria-label="Detener generación"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
              <span>Detener generación</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
