import { appConfig } from "../config/env.config";
import { AISettingsService } from "../config/ai-settings.service";
import { EventLoggerService } from "../logging/event-logger.service";
import { GeminiAIService } from "../ai/gemini-ai.service";
import { MockAIService } from "../ai/mock-ai.service";
import { DocxProtocolExporter } from "../export/docx-protocol.exporter";
import { BrowserFileDownloader } from "../download/browser-file.downloader";
import { ProtocolStrategyRegistry } from "../../core/strategies/protocol-strategy.registry";
import { IndividualProtocolStrategy } from "../../core/strategies/individual-protocol.strategy";
import { CollaborativeProtocolStrategy } from "../../core/strategies/collaborative-protocol.strategy";
import { GenerateProtocolUseCase } from "../../application/use-cases/generate-protocol.use-case";
import { ExportProtocolUseCase } from "../../application/use-cases/export-protocol.use-case";
import { IAIService } from "../../core/interfaces/ai-service.interface";
import { IDocumentExporter } from "../../core/interfaces/document-exporter.interface";
import { IFileDownloader } from "../../core/interfaces/file-downloader.interface";
import { ILogger } from "../../core/interfaces/logger.interface";

export interface AppContainer {
  logger: ILogger;
  protocolRegistry: ProtocolStrategyRegistry;
  aiService: IAIService;
  documentExporter: IDocumentExporter;
  fileDownloader: IFileDownloader;
  generateProtocolUseCase: GenerateProtocolUseCase;
  exportProtocolUseCase: ExportProtocolUseCase;
}

export interface ContainerOptions {
  apiKey?: string;
  modelName?: string;
  useMockAI?: boolean;
  customAiService?: IAIService;
  customExporter?: IDocumentExporter;
}

export function createContainer(options: ContainerOptions = {}): AppContainer {
  const logger = new EventLoggerService();

  // 1. Strategies registry (Open/Closed Principle: easily register new strategies)
  const protocolRegistry = new ProtocolStrategyRegistry([
    new IndividualProtocolStrategy(),
    new CollaborativeProtocolStrategy(),
  ]);

  // 2. AI Service (Liskov Substitution & Dependency Inversion)
  let aiService: IAIService;
  if (options.customAiService) {
    aiService = options.customAiService;
  } else if (options.useMockAI) {
    aiService = new MockAIService();
  } else {
    const settings = AISettingsService.getSettings();
    const apiKey = options.apiKey !== undefined ? options.apiKey : (settings.apiKey || appConfig.geminiApiKey);
    const model = options.modelName !== undefined ? options.modelName : (settings.model || appConfig.geminiModel);
    aiService = new GeminiAIService(apiKey, model);
  }

  // 3. Exporter & Downloader
  const documentExporter = options.customExporter || new DocxProtocolExporter(protocolRegistry);
  const fileDownloader = new BrowserFileDownloader();

  // 4. Use Cases
  const generateProtocolUseCase = new GenerateProtocolUseCase(aiService, protocolRegistry, logger);
  const exportProtocolUseCase = new ExportProtocolUseCase(documentExporter, fileDownloader, logger);

  return {
    logger,
    protocolRegistry,
    aiService,
    documentExporter,
    fileDownloader,
    generateProtocolUseCase,
    exportProtocolUseCase,
  };
}

// Singleton default container instance for the application runtime
export const container = createContainer();
