import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Protocol } from "../../core/entities/protocol.entity";
import { AppContainer, container as defaultContainer } from "../../infrastructure/di/container";

export function useProtocolController(
  appContainer: AppContainer = defaultContainer,
  onRequestConfig?: () => void
) {
  const [materia, setMateria] = useState("");
  const [temasTexto, setTemasTexto] = useState("");
  const [participantes, setParticipantes] = useState([""]);
  const [tipo, setTipo] = useState("individual");
  const [currentProtocol, setCurrentProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      appContainer.logger.info("Generación de protocolo detenida por el usuario.");
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, [appContainer]);

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
      .map((tema) => tema.replace(/^[•*-]\s*/, "").replace(/[.,;:\s]+$/, "").trim())
      .filter(Boolean);
  }, [temasTexto]);

  const participantesFiltrados = useMemo(() => {
    return participantes.map((p) => p.replace(/[.,;:\s]+$/, "").trim()).filter(Boolean);
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

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const generatedProtocol = await appContainer.generateProtocolUseCase.execute(
        {
          materia,
          temas: temasFiltrados,
          participantes: participantesFiltrados,
          tipo,
        },
        controller.signal
      );
      setCurrentProtocol(generatedProtocol);
    } catch (err) {
      if (
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError") ||
        (err instanceof Error && err.message.toLowerCase().includes("detenida")) ||
        (err instanceof Error && err.message.toLowerCase().includes("cancelada"))
      ) {
        // Cancelado limpiamente por el usuario
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      if (msg.toLowerCase().includes("api key") && onRequestConfig) {
        onRequestConfig();
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
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

  const handleExportPdf = async () => {
    if (!currentProtocol) return;

    setExportingPdf(true);
    try {
      await appContainer.exportPdfUseCase.execute(currentProtocol);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Error al descargar PDF: ${msg}`);
    } finally {
      setExportingPdf(false);
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
    exportingPdf,
    logs,
    errorMessage,
    handleGenerate,
    handleStop,
    handleExportWord,
    handleExportPdf,
  };
}
