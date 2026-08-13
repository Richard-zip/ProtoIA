import { useMemo, useState } from "react";
import { testGemini, type ProtocolType } from "./geminiTest";
import { downloadWordDocument } from "./wordExport";

type PreviewSection = {
  title: string;
  body: string[];
};

const SECTION_PATTERNS = [
  { label: "Protocolo", regex: /^(PROTOCOLO|PROTOCOLO\s+INDIVIDUAL|PROTOCOLO\s+COLABORATIVO)/i },
  { label: "Registro", regex: /^(REGISTRO\s+DE\s+PARTICIPANTES)/i },
  { label: "Descripción", regex: /^(DESCRIPCIÓN|DESCRIPCION)/i },
  { label: "Palabras clave", regex: /^(PALABRAS\s+CLAVE|PALABRAS\s+CLAVES)/i },
  { label: "Objetivos", regex: /^(OBJETIVOS)/i },
  { label: "Conceptos", regex: /^(CONCEPTOS\s+CLAVE|CONCEPTOS)/i },
  { label: "Resumen", regex: /^(RESUMEN)/i },
  { label: "Encuentros", regex: /^(ENCUENTROS\s+CONCEPTUALES)/i },
  { label: "Desacuerdos", regex: /^(DESENCUENTROS\s+CONCEPTUALES)/i },
  { label: "Metodología", regex: /^(METODOLOGÍA|METODOLOGIA)/i },
  { label: "Conclusiones", regex: /^(CONCLUSIONES)/i },
  { label: "Recomendaciones", regex: /^(DISCUSIONES\s+Y\s+RECOMENDACIONES|RECOMENDACIONES)/i },
  { label: "Bibliografía", regex: /^(BIBLIOGRAFÍA|BIBLIOGRAFIA)/i },
];

function parsePreviewSections(rawText: string): PreviewSection[] {
  const text = rawText.replace(/\r/g, "").trim();
  if (!text) {
    return [];
  }

  const lines = text.split("\n");
  const sections: PreviewSection[] = [];
  let currentTitle = "Resultado";
  let currentBody: string[] = [];

  const flush = () => {
    const cleanedBody = currentBody
      .map((line) => line.trim())
      .filter(Boolean);

    if (cleanedBody.length > 0) {
      sections.push({
        title: currentTitle,
        body: cleanedBody.join("\n").split(/\n{2,}/).map((entry) => entry.trim()).filter(Boolean),
      });
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentBody.length > 0) {
        currentBody.push("");
      }
      return;
    }

    const matchedSection = SECTION_PATTERNS.find(({ regex }) => regex.test(trimmed));
    if (matchedSection) {
      flush();
      currentTitle = matchedSection.label;
      currentBody = [];
      return;
    }

    currentBody.push(trimmed);
  });

  flush();

  return sections.length > 0 ? sections : [{ title: "Resultado", body: [text] }];
}

export default function UiTests() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [materia, setMateria] = useState("");
  const [temasTexto, setTemasTexto] = useState("");
  const [participantes, setParticipantes] = useState([""]);
  const [tipo, setTipo] = useState<ProtocolType>("colaborativo");

  const previewSections = useMemo(() => parsePreviewSections(text), [text]);
  const temasFiltrados = useMemo(() => parseTemas(temasTexto), [temasTexto]);
  const participantesFiltrados = useMemo(() => participantes.map((p) => p.trim()).filter(Boolean), [participantes]);

  const addLog = (line: string) => {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${line}`;
    console.info(entry);
    setLogs((s) => {
      const next = [...s, entry];
      return next.slice(-200);
    });
  };

  function parseTemas(value: string) {
    return value
      .split(/\r?\n+/)
      .map((tema) => tema.replace(/^[•*-]\s*/, "").trim())
      .filter(Boolean);
  }

  const actualizarParticipante = (index: number, value: string) => {
    setParticipantes((actuales) => actuales.map((p, i) => (i === index ? value : p)));
  };

  const agregarParticipante = () => {
    setParticipantes((actuales) => [...actuales, ""]);
  };

  const eliminarParticipante = (index: number) => {
    setParticipantes((actuales) => actuales.filter((_, i) => i !== index));
  };

  const handleClick = async () => {
    const reqId = Date.now();
    addLog(`(${reqId}) Click generar protocolo`);

    if (!materia.trim()) {
      addLog(`(${reqId}) Falta ingresar la materia`);
      setText("Ingresa la materia para generar el protocolo.");
      return;
    }

    if (temasFiltrados.length === 0) {
      addLog(`(${reqId}) Falta ingresar al menos un tema`);
      setText("Ingresa al menos un tema para generar el protocolo.");
      return;
    }

    if (tipo === "colaborativo" && participantesFiltrados.length === 0) {
      addLog(`(${reqId}) Falta ingresar al menos un participante`);
      setText("Ingresa al menos un participante para generar el protocolo colaborativo.");
      return;
    }

    setLoading(true);
    setText("");
    try {
      addLog(`(${reqId}) Llamando a testGemini() con materia="${materia.trim()}", temas=${temasFiltrados.join(", ")} y participantes=${participantesFiltrados.join(", ")}`);
      const start = Date.now();
      const result = await testGemini({ materia: materia.trim(), temas: temasFiltrados, participantes: participantesFiltrados, tipo });
      const duration = Date.now() - start;
      addLog(`(${reqId}) Respuesta recibida en ${duration} ms (long=${String(result).length})`);
      setText(result);
    } catch (err) {
      addLog(`(${reqId}) Error: ${err instanceof Error ? err.message : String(err)}`);
      setText("Error al generar el protocolo. Revisa la consola.");
      console.error(err);
    } finally {
      setLoading(false);
      addLog(`(${reqId}) Proceso finalizado`);
    }
  };

  const handleDownloadWord = async () => {
    if (!text.trim()) {
      addLog("Intento de descarga sin texto generado");
      return;
    }

    setExportingWord(true);
    try {
      await downloadWordDocument({
        materia: materia.trim(),
        content: text,
        participantes: participantesFiltrados,
        temas: temasFiltrados,
        tipo,
      });
      addLog("Documento Word descargado correctamente");
    } catch (err) {
      addLog(`Error al descargar Word: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
    } finally {
      setExportingWord(false);
    }
  };

  return (
    <div className="workspace-grid">
      <section className="panel panel-form">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Generación asistida</p>
            <h1>Crear protocolo académico profesional</h1>
          </div>
          <div className="badge">IA + exportación</div>
        </div>

        <label className="field">
          <span>Materia</span>
          <input
            value={materia}
            onChange={(event) => setMateria(event.target.value)}
            placeholder="Ej. Programación orientada a objetos"
          />
        </label>

        <div className="field">
          <span>Tipo de protocolo</span>
          <div className="segmented-control">
            <label className={`chip ${tipo === "individual" ? "active" : ""}`}>
              <input
                type="radio"
                checked={tipo === "individual"}
                onChange={() => setTipo("individual")}
              />
              Individual
            </label>
            <label className={`chip ${tipo === "colaborativo" ? "active" : ""}`}>
              <input
                type="radio"
                checked={tipo === "colaborativo"}
                onChange={() => setTipo("colaborativo")}
              />
              Colaborativo
            </label>
          </div>
        </div>

        <label className="field">
          <span>Temas</span>
          <textarea
            value={temasTexto}
            onChange={(event) => setTemasTexto(event.target.value)}
            placeholder="Pegue aquí los temas. Puede escribir uno por línea o pegar un bloque de texto libre."
            rows={6}
          />
          <small>Ejemplo: escriba uno por línea o un bloque completo; no hace falta usar comas ni puntos y coma.</small>
        </label>

        {tipo === "colaborativo" && (
          <div className="field">
            <div className="field-row">
              <span>Participantes</span>
              <button type="button" className="secondary-button" onClick={agregarParticipante}>
                + Añadir
              </button>
            </div>
            <div className="participant-list">
              {participantes.map((participante, index) => (
                <div key={index} className="participant-row">
                  <input
                    value={participante}
                    onChange={(event) => actualizarParticipante(index, event.target.value)}
                    placeholder={`Nombre del participante ${index + 1}`}
                  />
                  {participantes.length > 1 && (
                    <button type="button" className="ghost-button" onClick={() => eliminarParticipante(index)}>
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="actions-row">
          <button className="primary-button" onClick={handleClick} disabled={loading}>
            {loading ? "Generando protocolo…" : "Generar protocolo"}
          </button>
          <button className="secondary-button" onClick={handleDownloadWord} disabled={loading || exportingWord || !text.trim()}>
            {exportingWord ? "Descargando Word…" : "Descargar Word"}
          </button>
        </div>
      </section>

      <section className="panel panel-preview">
        <div className="panel-header preview-header">
          <div>
            <p className="eyebrow">Vista previa</p>
            <h2>{materia.trim() || "Tu protocolo listo para revisar"}</h2>
          </div>
          <div className="meta-pill">
            <span>{tipo === "individual" ? "Individual" : "Colaborativo"}</span>
            <span>{temasFiltrados.length} temas</span>
            <span>{participantesFiltrados.length} participantes</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loader" />
            <p>La IA está redactando el protocolo. Este proceso puede tardar unos segundos.</p>
          </div>
        ) : text.trim() ? (
          <div className="preview-content">
            {previewSections.map((section, index) => (
              <article key={`${section.title}-${index}`} className="preview-section">
                <h3>{section.title}</h3>
                <div className="preview-body">
                  {section.body.map((paragraph, paragraphIndex) => (
                    <p key={`${paragraphIndex}-${paragraph.substring(0, 12)}`}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Aún no hay contenido generado</h3>
            <p>Completa los datos y genera un protocolo para visualizar aquí una versión más clara y organizada del resultado.</p>
          </div>
        )}

        <div className="logs-card">
          <div className="logs-title">Actividad reciente</div>
          <div className="logs-list">
            {logs.length > 0 ? logs.slice(-8).map((entry, index) => <div key={`${entry}-${index}`}>{entry}</div>) : <div>No hay actividad todavía.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
