import { ProtocolStrategyRegistry } from "../src/core/strategies/protocol-strategy.registry.ts";
import { IndividualProtocolStrategy } from "../src/core/strategies/individual-protocol.strategy.ts";
import { CollaborativeProtocolStrategy } from "../src/core/strategies/collaborative-protocol.strategy.ts";
import { BaseProtocolStrategy } from "../src/core/strategies/base-protocol.strategy.ts";
import { ProtocolStrategyInput, TemplateTarget } from "../src/core/interfaces/protocol-strategy.interface.ts";
import { INDIVIDUAL_PROMPT } from "../src/core/prompts/individual.prompt.ts";
import { COLLABORATIVE_PROMPT } from "../src/core/prompts/collaborative.prompt.ts";
import { MockAIService } from "../src/infrastructure/ai/mock-ai.service.ts";
import { EventLoggerService } from "../src/infrastructure/logging/event-logger.service.ts";
import { GenerateProtocolUseCase } from "../src/application/use-cases/generate-protocol.use-case.ts";
import { ExportProtocolUseCase } from "../src/application/use-cases/export-protocol.use-case.ts";
import { IDocumentExporter, ExportFile } from "../src/core/interfaces/document-exporter.interface.ts";
import { IFileDownloader } from "../src/core/interfaces/file-downloader.interface.ts";
import { Protocol } from "../src/core/entities/protocol.entity.ts";
import { PdfProtocolExporter } from "../src/infrastructure/export/pdf-protocol.exporter.ts";
import {
  appendColonIfMissing,
  buildParagraphsXml,
  insertContentInCell,
  splitLabelOrListMarker,
  stripTags,
} from "../src/infrastructure/export/helpers/docx-xml.helper.ts";
import {
  AISettingsService,
  DEFAULT_FREE_MODEL,
  AVAILABLE_MODELS,
} from "../src/infrastructure/config/ai-settings.service.ts";
import fs from "node:fs";
import path from "node:path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runVerification() {
  console.log("=== INICIANDO PRUEBAS DE VERIFICACIÓN DE ARQUITECTURA SOLID ===\n");

  const logger = new EventLoggerService();
  const logsReceived: string[] = [];
  logger.subscribe((log) => logsReceived.push(log));

  // -------------------------------------------------------------
  // Test 1: Registry y estrategias base
  // -------------------------------------------------------------
  console.log("--- TEST 1: ProtocolStrategyRegistry y Estrategias Base ---");
  const registry = new ProtocolStrategyRegistry([
    new IndividualProtocolStrategy(),
    new CollaborativeProtocolStrategy(),
  ]);

  assert(registry.getAll().length === 2, "El registro contiene exactamente 2 estrategias iniciales");
  assert(registry.has("individual"), "El registro reconoce la estrategia 'individual'");
  assert(registry.has("colaborativo"), "El registro reconoce la estrategia 'colaborativo'");

  // -------------------------------------------------------------
  // Test 2: Inversión de Dependencias y Sustitución de Liskov (LSP + DIP)
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Principio de Inversión de Dependencias (DIP) y Sustitución de Liskov (LSP) ---");
  const mockAI = new MockAIService(10);
  const generateUseCase = new GenerateProtocolUseCase(mockAI, registry, logger);

  const individualResult = await generateUseCase.execute({
    materia: "Arquitectura de Software",
    temas: ["SOLID", "Clean Architecture"],
    participantes: [],
    tipo: "individual",
  });

  assert(individualResult instanceof Protocol, "GenerateProtocolUseCase retorna una instancia válida de Protocol");
  assert(individualResult.metadata.materia === "Arquitectura de Software", "La metadata del protocolo conserva la materia");
  assert(individualResult.sections.length > 0, `Se extrajeron secciones correctamente (${individualResult.sections.length} secciones)`);
  assert(typeof individualResult.extractedFields.conclusiones === "string", "Se extrajo el campo 'conclusiones'");

  // -------------------------------------------------------------
  // Test 3: Principio Abierto/Cerrado (OCP) - Crear nueva función sin modificar código existente
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Principio Abierto/Cerrado (OCP) - Extensibilidad sin Modificación ---");

  // Creamos un nuevo tipo de protocolo: "Protocolo de Investigación"
  class ResearchProtocolStrategy extends BaseProtocolStrategy {
    readonly id = "investigacion";
    readonly label = "Investigación Científica";
    readonly requiresParticipants = true;
    readonly defaultParticipantsText = "Investigador Principal\nCo-Investigador";
    readonly templatePath = "/PLANTILLA%20INVESTIGACION.docx";

    buildPrompt(input: ProtocolStrategyInput): string {
      return `PROTOCOLO DE INVESTIGACIÓN: ${input.materia} sobre ${input.temas.join(", ")}`;
    }

    extractSections(_rawText: string): Record<string, string> {
      void _rawText;
      return {
        hipotesis: "Hipótesis de investigación extraída",
        metodologia: "Método empírico cuantitativo",
        conclusiones: "Conclusiones preliminares",
      };
    }

    getTemplateTargets(extracted: Record<string, string>): TemplateTarget[] {
      return [
        { heading: "Hipótesis", content: extracted.hipotesis },
        { heading: "Metodología", content: extracted.metodologia },
        { heading: "Conclusiones", content: extracted.conclusiones },
      ];
    }
  }

  // Registramos la nueva estrategia en tiempo de ejecución SIN alterar el código de GenerateProtocolUseCase
  registry.register(new ResearchProtocolStrategy());

  assert(registry.getAll().length === 3, "El registro ahora contiene 3 estrategias");
  assert(registry.has("investigacion"), "La nueva estrategia 'investigacion' está registrada");

  const researchResult = await generateUseCase.execute({
    materia: "Inteligencia Artificial Aplicada",
    temas: ["Redes Neuronales", "Transformers"],
    participantes: ["Dra. Curie", "Dr. Turing"],
    tipo: "investigacion",
  });

  assert(researchResult.metadata.tipo === "investigacion", "El caso de uso ejecutó la nueva estrategia sin cambios");
  assert(researchResult.extractedFields.hipotesis === "Hipótesis de investigación extraída", "La nueva estrategia extrajo sus campos específicos");

  // Verificamos que las funciones preexistentes siguen intactas (No regresión)
  const colabResult = await generateUseCase.execute({
    materia: "Bases de Datos",
    temas: ["PostgreSQL", "Normalización"],
    participantes: ["Estudiante A", "Estudiante B"],
    tipo: "colaborativo",
  });
  assert(colabResult.metadata.tipo === "colaborativo", "La estrategia 'colaborativo' preexistente sigue funcionando sin fallos");

  // -------------------------------------------------------------
  // Test 4: Extensibilidad de Exporters (LSP + OCP)
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Exportación desacoplada y nuevo Exportador (Markdown) ---");

  class MockMarkdownExporter implements IDocumentExporter {
    readonly format = "markdown";

    async exportDocument(protocol: Protocol): Promise<ExportFile> {
      const content = `# ${protocol.formattedTitle}\n\n${protocol.rawText}`;
      const blob = new Blob([content], { type: "text/markdown" });
      return {
        blob,
        fileName: `${protocol.safeFileName.replace(".docx", ".md")}`,
        mimeType: "text/markdown",
      };
    }
  }

  let downloadedFile: ExportFile | null = null;
  const mockDownloader: IFileDownloader = {
    async download(file: ExportFile): Promise<void> {
      downloadedFile = file;
    },
  };

  const mdExporter = new MockMarkdownExporter();
  const exportUseCase = new ExportProtocolUseCase(mdExporter, mockDownloader, logger);

  await exportUseCase.execute(individualResult);

  assert(downloadedFile !== null, "El archivo de exportación fue descargado a través de la abstracción IFileDownloader");
  assert((downloadedFile as ExportFile)?.fileName.endsWith(".md"), "El nombre de archivo generado corresponde al formato del nuevo exportador (.md)");

  // -------------------------------------------------------------
  // Test 5: Reactive Logger (SRP)
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Logger reactivo desacoplado ---");
  assert(logsReceived.length > 5, `El logger reactivo capturó ${logsReceived.length} eventos de log correctamente`);

  // -------------------------------------------------------------
  // Test 6: Formato de conceptos con negrilla y dos puntos, y eliminación de espacios en docx
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Formato de Conceptos con Negrilla, Dos Puntos y Limpieza de Espacios ---");

  // 6.1: Conceptos en protocolo colaborativo
  assert(
    colabResult.extractedFields.conceptos.includes("**Arquitectura de software:**"),
    "Los conceptos en protocolo colaborativo contienen el nombre en negrilla con asteriscos y dos puntos"
  );
  assert(
    colabResult.extractedFields.conceptos.includes("**Principios SOLID:**"),
    "Principios SOLID está en negrilla y seguido de dos puntos"
  );

  // 6.2: Conceptos en protocolo individual
  assert(
    individualResult.extractedFields.conceptos.includes("**Encapsulamiento:**"),
    "Los conceptos en protocolo individual contienen el nombre en negrilla con asteriscos y dos puntos"
  );
  assert(
    individualResult.extractedFields.conceptos.includes("**Polimorfismo:**"),
    "Polimorfismo está en negrilla y seguido de dos puntos"
  );

  // 6.3: Objetivos y Recomendaciones compactados sin saltos excesivos
  assert(
    colabResult.extractedFields.objetivos.includes("**Objetivo General:**"),
    "Objetivo General está compactado en una sola línea en negrilla con dos puntos"
  );
  assert(
    colabResult.extractedFields.recomendaciones.includes("**Pregunta 1:**"),
    "Pregunta 1 en recomendaciones está en negrilla y seguida de dos puntos"
  );

  // 6.4: splitLabelOrListMarker conserva los dos puntos en el label
  const splitTest1 = splitLabelOrListMarker("**Arquitectura de software:** Estructura fundamental");
  assert(splitTest1 !== null && splitTest1.label === "Arquitectura de software:", "splitLabelOrListMarker extrae label con dos puntos");
  const splitTest2 = splitLabelOrListMarker("1. **Concepto Clave:** Descripción");
  assert(splitTest2 !== null && splitTest2.label === "1. Concepto Clave:", "splitLabelOrListMarker maneja numeración y dos puntos");

  // 6.5: appendColonIfMissing no produce '.:' en encabezados con punto final
  const headingWithDot = '<w:p><w:r><w:t xml:space="preserve">Palabras claves.</w:t></w:r></w:p>';
  const fixedHeading = appendColonIfMissing(headingWithDot);
  assert(
    stripTags(fixedHeading) === "Palabras claves:",
    "appendColonIfMissing reemplaza el punto final por dos puntos sin producir '.:'"
  );

  // 6.6: insertContentInCell descarta párrafos vacíos sobrantes en la plantilla
  const cellWithTrailingEmpty =
    '<w:tc><w:p><w:r><w:t>Registro de los participantes</w:t></w:r></w:p><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>';
  const resultCell = insertContentInCell(
    cellWithTrailingEmpty,
    "Registro de los participantes",
    "Estudiante Uno\nEstudiante Dos"
  );
  const paragraphCount = (resultCell.match(/<w:p\b/g) || []).length;
  assert(
    paragraphCount === 3,
    `insertContentInCell descarta párrafos vacíos sobrantes (esperados 3: encabezado + 2 estudiantes, obtenidos ${paragraphCount})`
  );

  // 6.7: buildParagraphsXml produce etiquetas bold con colon en el XML
  const paragraphsXml = buildParagraphsXml("**Concepto:** Definición con **término** en negrita.");
  assert(paragraphsXml.includes("<w:b/>"), "buildParagraphsXml incluye etiqueta <w:b/> para texto en negrita");
  assert(paragraphsXml.includes("Concepto:"), "buildParagraphsXml incluye el concepto con dos puntos");

  // 6.8: Extracción robusta de protocolo colaborativo con markdown de Gemini (##, **, etc.)
  const mockGeminiMarkdown = `
# PROTOCOLO COLABORATIVO - SEGURIDAD INFORMÁTICA

## REGISTRO DE PARTICIPANTES
Richard Assis
Maria Ines Arrieta

## DESCRIPCIÓN DEL TEXTO O ACTIVIDAD A REALIZAR
En este protocolo colaborativo se aborda la seguridad informatica y el pentesting...

## PALABRAS CLAVE
pentesting, caja blanca, caja negra, owasp, red, vulnerabilidades, exploit, seguridad

## OBJETIVOS DE LAS LECTURAS O ACTIVIDAD A REALIZAR
**Objetivo General:** Comprender las fases del pentesting mediante el analisis de pruebas de caja blanca y caja negra.

**Objetivos Específicos:**
1. Identificar las vulnerabilidades mas criticas del OWASP Top 10.
2. Comparar metodologias de caja blanca y caja negra.
3. Evaluar vectores de ataque en redes corporativas.

## CONCEPTOS CLAVES Y DEFINICIONES
**Pentesting:** Evaluacion de la seguridad mediante simulacion de ataques reales.
**Caja Blanca:** Tipo de prueba donde el atacante conoce el codigo y arquitectura.
**OWASP Top 10:** Documento estandar que enumera los diez riesgos mas criticos.

## RESUMEN DE LAS DISCUSIONES GRUPALES
- Pentesting Automático vs Manual: Discutimos la efectividad de herramientas automatizadas...
- Ética en Pruebas de Intrusión: Concordamos en la necesidad de contratos de confidencialidad...

## ENCUENTROS CONCEPTUALES
- Todos concordamos en que la caja blanca permite mayor cobertura de codigo.
- Hubo acuerdo unánime en que OWASP Top 10 debe ser el punto de partida.

## DESENCUENTROS CONCEPTUALES
- Uso de herramientas propietarias vs open source: Postura comercial vs postura comunitaria.

## METODOLOGÍA DE TRABAJO (CÓMO SE HIZO LA ACTIVIDAD COLABORATIVA)
Para realizar esta actividad colaborativa dividimos los temas entre los dos integrantes...

## CONCLUSIONES
Después de estudiar y discutir colaborativamente seguridad informatica, concluimos que el pentesting es clave...

## DISCUSIONES Y RECOMENDACIONES
**Pregunta 1:** ¿En qué medida es etico realizar pruebas de penetracion sin autorizacion previa en sistemas publicos?
**Pregunta 2:** ¿Como balancear el tiempo de analisis de caja blanca con los costos operativos?

## BIBLIOGRAFÍA
1. Scambray, J. (2018). Hacking Exposed.
2. OWASP Foundation. (2021). OWASP Top Ten.
`;

  const colabStrategy = new CollaborativeProtocolStrategy();
  const extractedColab = colabStrategy.extractSections(mockGeminiMarkdown, {
    materia: "Seguridad Informática",
    temas: ["Pentesting", "Caja Blanca", "OWASP Top 10"],
    participantes: ["Richard Assis", "Maria Ines Arrieta"],
    tipo: "colaborativo",
  });

  assert(
    extractedColab.conceptos.includes("**Pentesting:**") &&
    extractedColab.conceptos.includes("**Caja Blanca:**"),
    "Las secciones de conceptos con markdown ('## CONCEPTOS CLAVES Y DEFINICIONES') se extraen correctamente"
  );
  assert(
    extractedColab.resumen.includes("Pentesting Automático vs Manual"),
    "El resumen de discusiones grupales se extrae correctamente sin caer en fallback"
  );
  assert(
    extractedColab.encuentros.includes("Todos concordamos en que la caja blanca"),
    "Los encuentros conceptuales se extraen del markdown de Gemini"
  );
  assert(
    extractedColab.recomendaciones.includes("**Pregunta 1:** ¿En qué medida es etico"),
    "Las discusiones y recomendaciones se extraen del markdown de Gemini"
  );

  // -------------------------------------------------------------
  // Test 7: Normalización de Mayúsculas Sostenidas y Puntuación Anómala
  // -------------------------------------------------------------
  console.log("\n--- TEST 7: Normalización de Mayúsculas Sostenidas y Puntuación Anómala ---");

  const allCapsInput = {
    materia: "SEGURIDAD INFORMATICA",
    temas: [
      "FASES DE UN PENTESTING.",
      "PRUEBAS DE CAJA BLANCA Y CAJA NEGRA.",
      "OWASP TOP TEN.",
      "ATAQUES DE RED.",
    ],
    participantes: ["RICHARD ASSIS.", "MARIA INES ARRIETA."],
    tipo: "colaborativo",
  };

  const allCapsUseCaseResult = await generateUseCase.execute(allCapsInput);

  assert(
    allCapsUseCaseResult.metadata.temas.every((t) => !t.endsWith(".")),
    "Los temas limpios en la metadata no tienen punto final"
  );
  assert(
    allCapsUseCaseResult.metadata.participantes.every((p) => !p.endsWith(".")),
    "Los participantes limpios en la metadata no tienen punto final"
  );

  const individualStrategy = new IndividualProtocolStrategy();
  const builtPromptIndiv = individualStrategy.buildPrompt(allCapsInput);

  assert(
    !builtPromptIndiv.includes("FASES DE UN PENTESTING"),
    "El prompt individual no contiene temas en mayúsculas sostenidas"
  );
  assert(
    builtPromptIndiv.includes("fases de un pentesting"),
    "El prompt individual convirtió el primer tema a minúsculas naturales"
  );
  assert(
    builtPromptIndiv.includes("OWASP"),
    "El prompt individual preserva siglas técnicas en mayúsculas (OWASP)"
  );
  assert(
    !/([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ])\.\.(?!\.)/.test(builtPromptIndiv),
    "El prompt individual no genera dobles puntos (..)"
  );

  const builtPromptColab = colabStrategy.buildPrompt(allCapsInput);
  assert(
    !builtPromptColab.includes("FASES DE UN PENTESTING"),
    "El prompt colaborativo no contiene temas en mayúsculas sostenidas"
  );
  assert(
    builtPromptColab.includes("aborda fases de un pentesting"),
    "El prompt colaborativo sustituyó correctamente [tema] en minúsculas naturales"
  );
  assert(
    !builtPromptColab.includes("[tema]") && !builtPromptColab.includes("[TEMA]"),
    "El prompt colaborativo no deja etiquetas [tema] sin sustituir"
  );

  class TestStrategy extends BaseProtocolStrategy {
    readonly id = "test";
    readonly label = "Test";
    readonly requiresParticipants = false;
    readonly defaultParticipantsText = "";
    readonly templatePath = "";
    buildPrompt(): string { return ""; }
    extractSections(): Record<string, string> { return {}; }
    getTemplateTargets(): TemplateTarget[] { return []; }

    public testNormalize(val: string): string {
      return this.normalizeSectionText(val);
    }
    public testFormatConcepts(val: string): string {
      return this.formatConceptDefinitions(val);
    }
  }

  const testStrategy = new TestStrategy();
  const dirtyAiText = "La actividad consiste en demostrar mi comprensión de FASES DE UN PENTESTING y OWASP TOP TEN..";
  const cleanedAiText = testStrategy.testNormalize(dirtyAiText);

  assert(
    !cleanedAiText.includes("FASES DE UN PENTESTING"),
    "normalizeSectionText elimina bloques de mayúsculas sostenidas de la IA"
  );
  assert(
    cleanedAiText.includes("fases de un pentesting"),
    "normalizeSectionText convierte las palabras a minúsculas naturales"
  );
  assert(
    cleanedAiText.includes("OWASP"),
    "normalizeSectionText preserva la sigla técnica OWASP en mayúsculas"
  );
  assert(
    !cleanedAiText.includes(".."),
    "normalizeSectionText convierte dobles puntos (..) en un solo punto"
  );

  const conceptsWithAllCaps = "**FASES DE UN PENTESTING:** Etapas secuenciales de una prueba de intrusión.";
  const formattedConcepts = testStrategy.testFormatConcepts(conceptsWithAllCaps);
  assert(
    formattedConcepts.includes("**Fases de un pentesting:**"),
    "formatConceptDefinitions convierte términos en mayúsculas a formato Capitalizado estándar con dos puntos"
  );

  // -------------------------------------------------------------
  // Test 8: Exportación a PDF (LSP, DIP, OCP)
  // -------------------------------------------------------------
  console.log("\n--- TEST 8: Exportador de Protocolo a PDF ---");

  class MockDocxExporter implements IDocumentExporter {
    readonly format = "docx";
    async exportDocument(protocol: Protocol): Promise<ExportFile> {
      return {
        blob: new Blob(["mock-docx"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
        fileName: protocol.safeFileName,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }
  }

  const mockDocx = new MockDocxExporter();
  const pdfExporter = new PdfProtocolExporter(mockDocx);
  assert(pdfExporter.format === "pdf", "PdfProtocolExporter tiene formato 'pdf'");

  let pdfDownloadedFile: ExportFile | null = null;
  const pdfDownloader: IFileDownloader = {
    async download(file: ExportFile): Promise<void> {
      pdfDownloadedFile = file;
    },
  };

  const exportPdfUseCase = new ExportProtocolUseCase(pdfExporter, pdfDownloader, logger);
  await exportPdfUseCase.execute(colabResult);

  assert(pdfDownloadedFile !== null, "El caso de uso de exportación a PDF ejecutó la descarga");
  assert(
    (pdfDownloadedFile as ExportFile)?.fileName.endsWith(".pdf"),
    `El archivo generado termina en .pdf: "${(pdfDownloadedFile as ExportFile)?.fileName}"`
  );
  assert(
    (pdfDownloadedFile as ExportFile)?.mimeType === "application/pdf",
    "El tipo MIME del archivo exportado es application/pdf"
  );
  assert(
    colabResult.safePdfFileName.endsWith(".pdf"),
    "La entidad Protocol tiene propiedad safePdfFileName válida"
  );

  // -------------------------------------------------------------
  // Test 9: Regla 5 para ignorar números, símbolos y emojis en temas
  // -------------------------------------------------------------
  console.log("\n--- TEST 9: Regla 5 de la IA para Ignorar Números, Símbolos y Emojis en Temas ---");

  assert(
    INDIVIDUAL_PROMPT.includes("5. IGNORAR NÚMEROS, SÍMBOLOS Y EMOJIS EN LOS TEMAS:"),
    "El prompt individual incluye explícitamente la Regla 5 para instruir a la IA a descartar números, símbolos y emojis"
  );
  assert(
    COLLABORATIVE_PROMPT.includes("5. IGNORAR NÚMEROS, SÍMBOLOS Y EMOJIS EN LOS TEMAS:"),
    "El prompt colaborativo incluye explícitamente la Regla 5 para instruir a la IA a descartar números, símbolos y emojis"
  );
  assert(
    INDIVIDUAL_PROMPT.includes("1) Tema") && INDIVIDUAL_PROMPT.includes("#Tema") && INDIVIDUAL_PROMPT.includes("Tema ✅"),
    "La Regla 5 del prompt individual cubre los ejemplos especificados por el usuario ('1) Tema', '#Tema', 'Tema ✅')"
  );
  assert(
    COLLABORATIVE_PROMPT.includes("1) Tema") && COLLABORATIVE_PROMPT.includes("#Tema") && COLLABORATIVE_PROMPT.includes("Tema ✅"),
    "La Regla 5 del prompt colaborativo cubre los ejemplos especificados por el usuario ('1) Tema', '#Tema', 'Tema ✅')"
  );

  const dirtyTopicsInput = {
    materia: "Seguridad Informática",
    temas: [
      "1) Fases de un pentesting",
      "# OWASP TOP TEN",
      "Ataques de red ✅",
      "🚀 Pruebas de caja blanca",
    ],
    participantes: ["Richard Assis"],
    tipo: "individual",
  };

  const dirtyPromptIndiv = individualStrategy.buildPrompt(dirtyTopicsInput);
  assert(
    dirtyPromptIndiv.includes("fases de un pentesting"),
    "buildPrompt adapta el primer tema con numeración de forma limpia en el texto"
  );

  const extractedIndiv = individualStrategy.extractSections("PROTOCOLO INDIVIDUAL", dirtyTopicsInput);
  assert(
    !extractedIndiv.descripcion.includes("1)") && !extractedIndiv.descripcion.includes("✅"),
    "La estrategia extrae descripciones sin numeración 1) ni emojis ✅"
  );
  assert(
    !extractedIndiv.temas.includes("1)") && !extractedIndiv.temas.includes("✅"),
    "La lista de temas fallback se limpia de numeración 1) y emojis ✅"
  );

  // -------------------------------------------------------------
  // Test 10: Restricción exclusiva al modelo gratuito por defecto (Gemini 2.5 Flash)
  // -------------------------------------------------------------
  console.log("\n--- TEST 10: Modelo Exclusivo de API Gratuita por Defecto ---");
  assert(
    DEFAULT_FREE_MODEL === "gemini-2.5-flash",
    "El modelo gratuito por defecto es gemini-2.5-flash"
  );
  assert(
    AVAILABLE_MODELS.length === 1 && AVAILABLE_MODELS[0].id === "gemini-2.5-flash",
    "AVAILABLE_MODELS contiene exclusivamente el modelo gratuito por defecto"
  );
  assert(
    AVAILABLE_MODELS[0].badge === "API Gratuita",
    "El modelo gratuito está identificado con la insignia 'API Gratuita'"
  );

  const currentSettings = AISettingsService.getSettings();
  assert(
    currentSettings.model === "gemini-2.5-flash",
    "AISettingsService.getSettings() retorna de manera fija el modelo gratuito gemini-2.5-flash"
  );

  AISettingsService.saveSettings({ apiKey: "test-key", model: "otro-modelo-pago" });
  const savedSettings = AISettingsService.getSettings();
  assert(
    savedSettings.model === "gemini-2.5-flash",
    "AISettingsService fuerza el almacenamiento exclusivo del modelo gratuito por defecto"
  );

  // -------------------------------------------------------------
  // Test 11: Motor nativo LibreOffice para exportación idéntica a Word
  // -------------------------------------------------------------
  console.log("\n--- TEST 11: Motor Nativo LibreOffice Embebido para PDF ---");
  const binDir = path.resolve("bin", "libreoffice");
  assert(fs.existsSync(binDir), "El directorio 'bin/libreoffice' existe dentro del proyecto");

  const sofficeWrapper = path.join(binDir, "soffice");
  assert(fs.existsSync(sofficeWrapper), "El ejecutable wrapper 'bin/libreoffice/soffice' existe");
  const stats = fs.statSync(sofficeWrapper);
  assert((stats.mode & 0o111) !== 0, "El ejecutable wrapper tiene permisos de ejecución (chmod +x)");

  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  assert(
    packageJson.build?.extraResources?.some((r: { from?: string }) => r.from === "bin/libreoffice"),
    "package.json empaqueta 'bin/libreoffice' en extraResources de electron-builder"
  );

  console.log("\n--- TEST 12: Visualización de Páginas Reales con LibreOffice (Opción 1) ---");
  const mainTs = fs.readFileSync("electron/main.ts", "utf-8");
  assert(
    mainTs.includes("render-protocol-pages"),
    "electron/main.ts implementa el canal IPC 'render-protocol-pages'"
  );
  assert(
    mainTs.includes("runLibreOfficeConversion"),
    "electron/main.ts invoca runLibreOfficeConversion para la vista previa"
  );

  const preloadTs = fs.readFileSync("electron/preload.ts", "utf-8");
  assert(
    preloadTs.includes("renderProtocolPages"),
    "electron/preload.ts expone 'renderProtocolPages' a través del puente de contexto seguro"
  );

  const viteEnvTs = fs.readFileSync("src/vite-env.d.ts", "utf-8");
  assert(
    viteEnvTs.includes("renderProtocolPages"),
    "src/vite-env.d.ts define el tipado estricto para 'renderProtocolPages'"
  );

  const docxPreviewTs = fs.readFileSync("src/presentation/components/DocxPreview.tsx", "utf-8");
  assert(
    docxPreviewTs.includes("renderWithLibreOffice"),
    "DocxPreview.tsx implementa renderWithLibreOffice como motor de páginas reales"
  );
  assert(
    docxPreviewTs.includes("protocol-paper-sheet"),
    "DocxPreview.tsx renderiza hojas de papel físicas con numeración oficial"
  );

  console.log("\n🎉 TODAS LAS VERIFICACIONES DE ARQUITECTURA Y PRINCIPIOS SOLID PASARON EXITOSAMENTE.");

}

runVerification().catch((err) => {
  console.error("Error en verificación:", err);
  process.exit(1);
});
