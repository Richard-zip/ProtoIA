import React from "react";
import { useProtocolController } from "./hooks/useProtocolController";
import { ProtocolForm } from "./components/ProtocolForm";
import { ProtocolPreview } from "./components/ProtocolPreview";
import { AppContainer, container as defaultContainer } from "../infrastructure/di/container";

interface ProtocolAppProps {
  appContainer?: AppContainer;
  onRequestConfig?: () => void;
}

export const ProtocolApp: React.FC<ProtocolAppProps> = ({ appContainer, onRequestConfig }) => {
  const {
    materia,
    setMateria,
    temasTexto,
    setTemasTexto,
    participantes,
    tipo,
    setTipo,
    actualizarParticipante,
    agregarParticipante,
    eliminarParticipante,
    availableStrategies,
    activeStrategy,
    temasFiltrados,
    participantesFiltrados,
    currentProtocol,
    loading,
    exportingWord,
    errorMessage,
    handleGenerate,
    handleExportWord,
  } = useProtocolController(appContainer, onRequestConfig);

  const activeContainer = appContainer || defaultContainer;

  return (
    <div className="workspace-grid">
      <ProtocolForm
        materia={materia}
        onMateriaChange={setMateria}
        temasTexto={temasTexto}
        onTemasTextoChange={setTemasTexto}
        participantes={participantes}
        onActualizarParticipante={actualizarParticipante}
        onAgregarParticipante={agregarParticipante}
        onEliminarParticipante={eliminarParticipante}
        tipo={tipo}
        onTipoChange={setTipo}
        availableStrategies={availableStrategies}
        activeStrategy={activeStrategy}
        loading={loading}
        onGenerate={handleGenerate}
      />

      <ProtocolPreview
        materia={materia}
        activeStrategy={activeStrategy}
        temasCount={temasFiltrados.length}
        participantesCount={participantesFiltrados.length}
        protocol={currentProtocol}
        loading={loading}
        exportingWord={exportingWord}
        errorMessage={errorMessage}
        documentExporter={activeContainer.documentExporter}
        onRetry={handleGenerate}
        onExportWord={handleExportWord}
        onRequestConfig={onRequestConfig}
      />
    </div>
  );
};

export default ProtocolApp;
