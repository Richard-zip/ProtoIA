import { useState, useEffect } from "react";
import ProtocolApp from "./presentation/ProtocolApp";
import { AISettingsModal } from "./presentation/components/AISettingsModal";
import {
  AISettings,
  AISettingsService,
} from "./infrastructure/config/ai-settings.service";
import { createContainer, AppContainer } from "./infrastructure/di/container";
import "./App.css";

export default function App() {
  const [aiSettings, setAiSettings] = useState<AISettings>(() =>
    AISettingsService.getSettings()
  );
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [hasCheckedInitialKey, setHasCheckedInitialKey] = useState(false);

  const [appContainer, setAppContainer] = useState<AppContainer>(() => {
    const initial = AISettingsService.getSettings();
    return createContainer({
      apiKey: initial.apiKey,
      modelName: initial.model,
    });
  });

  const hasApiKey = Boolean(aiSettings.apiKey && aiSettings.apiKey.trim().length > 0);

  useEffect(() => {
    // Si no se cuenta con API Key guardada, se abre el modal automáticamente
    if (!AISettingsService.hasValidApiKey()) {
      setIsConfigOpen(true);
    }
    setHasCheckedInitialKey(true);
  }, []);

  const handleSaveSettings = (newSettings: AISettings) => {
    AISettingsService.saveSettings(newSettings);
    setAiSettings(newSettings);
    setAppContainer(
      createContainer({
        apiKey: newSettings.apiKey,
        modelName: newSettings.model,
      })
    );
    setIsConfigOpen(false);
  };

  return (
    <div className="app-root">
      <header className="app-topbar">
        <div className="brand-group">
          <div className="brand-icon-wrapper" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="brand-icon-svg"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>
          <div className="brand-info">
            <div className="brand-title-row">
              <h1 className="brand-title">Agnes</h1>
              <span className="brand-badge">IA</span>
            </div>
            <p className="brand-subtitle">Generador Inteligente de Protocolos Académicos</p>
          </div>
        </div>

        <div className="topbar-meta">
          <div className="topbar-chip" title="Exportación estructurada de documentos en formato DOCX">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="m9 15 2 2 4-4" />
            </svg>
            <span>Plantillas Estructuradas</span>
          </div>

          <button
            type="button"
            className={`topbar-chip topbar-config-btn ${hasApiKey ? "status-active" : "status-warning"}`}
            onClick={() => setIsConfigOpen(true)}
            title="Haz clic para consultar o configurar tu API Key gratuita de Gemini"
          >
            {hasApiKey ? (
              <>
                <span className="status-live-dot" aria-hidden="true" />
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
                <span className="topbar-model-name">Gemini 2.5 Flash (Gratis)</span>
                <span className="topbar-config-tag">API Key</span>
              </>
            ) : (
              <>
                <span className="status-warn-dot" aria-hidden="true" />
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Configurar API Key</span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="app-shell">
        <ProtocolApp
          key={`${aiSettings.apiKey}-${aiSettings.model}`}
          appContainer={appContainer}
          onRequestConfig={() => setIsConfigOpen(true)}
        />
      </main>

      <AISettingsModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentSettings={aiSettings}
        onSave={handleSaveSettings}
        isInitialSetup={hasCheckedInitialKey && !hasApiKey}
      />
    </div>
  );
}

