import React, { useState, useEffect } from "react";
import {
  AISettings,
  AVAILABLE_MODELS,
  testGeminiConnection,
} from "../../infrastructure/config/ai-settings.service";
import { openExternalLink } from "../utils/open-external";

export interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AISettings;
  onSave: (newSettings: AISettings) => void;
  isInitialSetup?: boolean;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  isInitialSetup = false,
}) => {
  const [apiKey, setApiKey] = useState(currentSettings.apiKey);
  const [selectedModel, setSelectedModel] = useState(currentSettings.model || "gemini-2.5-flash");
  const [isCustomModel, setIsCustomModel] = useState(
    !AVAILABLE_MODELS.some((m) => m.id === (currentSettings.model || "gemini-2.5-flash"))
  );
  const [customModelInput, setCustomModelInput] = useState(
    !AVAILABLE_MODELS.some((m) => m.id === (currentSettings.model || "gemini-2.5-flash"))
      ? currentSettings.model
      : ""
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(currentSettings.apiKey);
      const isKnown = AVAILABLE_MODELS.some((m) => m.id === currentSettings.model);
      if (isKnown) {
        setSelectedModel(currentSettings.model);
        setIsCustomModel(false);
      } else if (currentSettings.model) {
        setIsCustomModel(true);
        setCustomModelInput(currentSettings.model);
      } else {
        setSelectedModel("gemini-2.5-flash");
        setIsCustomModel(false);
      }
      setTestResult(null);
      setValidationError(null);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const effectiveModel = isCustomModel ? customModelInput.trim() : selectedModel;

  const handleTest = async () => {
    setValidationError(null);
    if (!apiKey.trim()) {
      setValidationError("Ingresa una API Key para poder realizar la prueba de conexión.");
      return;
    }
    if (isCustomModel && !customModelInput.trim()) {
      setValidationError("Escribe el nombre del modelo personalizado que deseas probar.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testGeminiConnection(apiKey, effectiveModel);
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Error inesperado al probar conexión.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setValidationError("La API Key es obligatoria para el funcionamiento de la aplicación.");
      return;
    }

    const cleanModel = isCustomModel ? customModelInput.trim() : selectedModel;
    if (!cleanModel) {
      setValidationError("Debes seleccionar o ingresar un modelo válido.");
      return;
    }

    onSave({
      apiKey: cleanKey,
      model: cleanModel,
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText("https://aistudio.google.com/app/apikey");
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignorar fallback
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-settings-title">
      <div className="modal-dialog">
        <header className="modal-header">
          <div className="modal-header-icon-wrap" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="modal-header-text">
            <h2 id="modal-settings-title" className="modal-title">
              {isInitialSetup ? "Bienvenido a Agnes — Configuración Inicial" : "Configuración del Motor de IA"}
            </h2>
            <p className="modal-subtitle">
              Ingresa tu API Key de Google Gemini y el modelo deseado para habilitar la generación académica.
            </p>
          </div>
          {!isInitialSetup && (
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              title="Cerrar ventana"
              aria-label="Cerrar ventana"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </header>

        <form onSubmit={handleSave} className="modal-body">
          {/* Mensaje de bienvenida si es configuración inicial */}
          {isInitialSetup && (
            <div className="modal-notice-banner">
              <div className="notice-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div className="notice-content">
                <strong>Configura tu clave de acceso</strong>
                <p>
                  Para que cada usuario trabaje de forma autónoma y sin límites compartidos, Agnes requiere tu propia clave de Google Gemini. Tu clave se conserva cifrada y almacenada localmente en tu equipo.
                </p>
              </div>
            </div>
          )}

          {/* Campo API Key */}
          <div className="field">
            <div className="field-header">
              <label htmlFor="settings-api-key" className="field-label">
                Google Gemini API Key
              </label>
              <span className="field-badge accent">Requerido</span>
            </div>
            <div className="input-with-action">
              <input
                id="settings-api-key"
                type={showApiKey ? "text" : "password"}
                className="field-input"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setValidationError(null);
                }}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                className="input-eye-btn"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? "Ocultar clave" : "Mostrar clave"}
                aria-label={showApiKey ? "Ocultar clave" : "Mostrar clave"}
              >
                {showApiKey ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <div className="apikey-helper-row">
              <span className="helper-text">
                ¿No tienes una API Key? Es gratuita y se obtiene en segundos.
              </span>
              <div className="helper-links">
                <button
                  type="button"
                  className="helper-link-btn"
                  onClick={() => openExternalLink("https://aistudio.google.com/app/apikey")}
                  title="Abrir Google AI Studio en tu navegador externo"
                >
                  <span>Google AI Studio</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="copy-url-btn"
                  onClick={handleCopyLink}
                  title="Copiar enlace de Google AI Studio"
                >
                  {copiedLink ? "¡Enlace copiado!" : "Copiar enlace"}
                </button>
              </div>
            </div>
            <p className="external-browser-hint">
              Se abrirá en tu navegador externo para que inicies sesión con Google y copies tu clave de forma segura.
            </p>
          </div>

          {/* Campo Modelo de Gemini */}
          <div className="field">
            <div className="field-header">
              <label className="field-label">Modelo de Inteligencia Artificial</label>
              <span className="field-badge">Selección de Motor</span>
            </div>

            <div className="model-selector-grid">
              {AVAILABLE_MODELS.map((modelOpt) => {
                const isSelected = !isCustomModel && selectedModel === modelOpt.id;
                return (
                  <button
                    key={modelOpt.id}
                    type="button"
                    className={`model-option-card ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setIsCustomModel(false);
                      setSelectedModel(modelOpt.id);
                    }}
                  >
                    <div className="model-option-top">
                      <span className="model-option-name">{modelOpt.name}</span>
                      {modelOpt.badge && (
                        <span className={`model-option-badge ${modelOpt.badge === "Recomendado" ? "recommended" : "advanced"}`}>
                          {modelOpt.badge}
                        </span>
                      )}
                    </div>
                    <p className="model-option-desc">{modelOpt.description}</p>
                  </button>
                );
              })}

              <button
                type="button"
                className={`model-option-card custom ${isCustomModel ? "selected" : ""}`}
                onClick={() => setIsCustomModel(true)}
              >
                <div className="model-option-top">
                  <span className="model-option-name">Personalizado</span>
                  <span className="model-option-badge">Manual</span>
                </div>
                <p className="model-option-desc">Ingresa cualquier otro identificador de modelo disponible en Gemini.</p>
              </button>
            </div>

            {isCustomModel && (
              <div className="custom-model-input-wrap">
                <input
                  type="text"
                  className="field-input"
                  placeholder="Ej: gemini-2.0-flash-exp, gemini-1.5-flash-8b..."
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          {/* Resultado de prueba o errores */}
          {testResult && (
            <div className={`test-result-banner ${testResult.success ? "success" : "error"}`} role="alert">
              {testResult.success ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {validationError && (
            <div className="test-result-banner error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{validationError}</span>
            </div>
          )}

          {/* Footer de acciones */}
          <footer className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary btn-test-conn"
              onClick={handleTest}
              disabled={isTesting}
            >
              {isTesting ? (
                <>
                  <svg className="spinner-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>Probando conexión...</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  <span>Probar Conexión</span>
                </>
              )}
            </button>

            <div className="modal-footer-main-actions">
              {!isInitialSetup && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>Guardar Configuración</span>
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};
