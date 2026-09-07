import { ProtocolStrategyRegistry } from "../src/core/strategies/protocol-strategy.registry.ts";
import { IndividualProtocolStrategy } from "../src/core/strategies/individual-protocol.strategy.ts";
import { CollaborativeProtocolStrategy } from "../src/core/strategies/collaborative-protocol.strategy.ts";
import { BaseProtocolStrategy } from "../src/core/strategies/base-protocol.strategy.ts";
import { ProtocolStrategyInput, TemplateTarget } from "../src/core/interfaces/protocol-strategy.interface.ts";
import { MockAIService } from "../src/infrastructure/ai/mock-ai.service.ts";
import { EventLoggerService } from "../src/infrastructure/logging/event-logger.service.ts";
import { GenerateProtocolUseCase } from "../src/application/use-cases/generate-protocol.use-case.ts";
import { ExportProtocolUseCase } from "../src/application/use-cases/export-protocol.use-case.ts";
import { IDocumentExporter, ExportFile } from "../src/core/interfaces/document-exporter.interface.ts";
import { IFileDownloader } from "../src/core/interfaces/file-downloader.interface.ts";
import { Protocol } from "../src/core/entities/protocol.entity.ts";

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

  console.log("\n🎉 TODAS LAS VERIFICACIONES DE ARQUITECTURA Y PRINCIPIOS SOLID PASARON EXITOSAMENTE.");
}

runVerification().catch((err) => {
  console.error("Error en verificación:", err);
  process.exit(1);
});
