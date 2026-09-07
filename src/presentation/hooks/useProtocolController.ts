import { useState, useEffect, useMemo, useCallback } from "react";
import { Protocol } from "../../core/entities/protocol.entity";
import { AppContainer, container as defaultContainer } from "../../infrastructure/di/container";

export function useProtocolController(
  appContainer: AppContainer = defaultContainer,
  onRequestConfig?: () => void
) {
  const [materia, setMateria] = useState("");
  const [temasTexto, setTemasTexto] = useState("");
  const [participantes, setParticipantes] = useState([""]);
  const [tipo, setTipo] = useState("colaborativo");
  const [currentProtocol, setCurrentProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscribe to logger events
  useEffect(() => {
    setLogs(appContainer.logger.getRecentLogs());
    const unsubscribe = appContainer.logger.subscribe((entry) => {
      setLogs((prev) => [...prev, entry].slice(-200));
    });
    return unsubscribe;
  }, [appContainer]);

  // Available strategies queryable from the registry (Open/Closed Principle)
  const availableStrategies = useMemo(() => {
    return appContainer.protocolRegistry.getAll();
  }, [appContainer]);

  const activeStrategy = useMemo(() => {
    return appContainer.protocolRegistry.get(tipo);
  }, [appContainer, tipo]);

  const temasFiltrados = useMemo(() => {
    return temasTexto
      .split(/\r?\n+/)
      .map((tema) => tema.replace(/^[•*-]\s*/, "").trim())
      .filter(Boolean);
  }, [temasTexto]);

  const participantesFiltrados = useMemo(() => {
    return participantes.map((p) => p.trim()).filter(Boolean);
  }, [participantes]);

  const actualizarParticipante = useCallback((index: number, value: string) => {
    setParticipantes((actuales) => actuales.map((p, i) => (i === index ? value : p)));
  }, []);

  const agregarParticipante = useCallback(() => {
    setParticipantes((actuales) => [...actuales, ""]);
  }, []);

  const eliminarParticipante = useCallback((index: number) => {
    setParticipantes((actuales) => actuales.filter((_, i) => i !== index));
  }, []);

  const handleGenerate = async () => {
    setErrorMessage(null);
    setLoading(true);

    try {
      const generatedProtocol = await appContainer.generateProtocolUseCase.execute({
        materia,
        temas: temasFiltrados,
        participantes: participantesFiltrados,
        tipo,
      });
      setCurrentProtocol(generatedProtocol);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      if (msg.toLowerCase().includes("api key") && onRequestConfig) {
        onRequestConfig();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportWord = async () => {
    if (!currentProtocol) return;

    setExportingWord(true);
    try {
      await appContainer.exportProtocolUseCase.execute(currentProtocol);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Error al descargar Word: ${msg}`);
    } finally {
      setExportingWord(false);
    }
  };

  return {
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
    logs,
    errorMessage,
    handleGenerate,
    handleExportWord,
  };
}
