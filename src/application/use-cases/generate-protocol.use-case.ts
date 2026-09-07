import { Protocol, ProtocolMetadata } from "../../core/entities/protocol.entity";
import { IAIService } from "../../core/interfaces/ai-service.interface";
import { ILogger } from "../../core/interfaces/logger.interface";
import { IProtocolRegistry } from "../../core/strategies/protocol-strategy.registry";
import { parsePreviewSections } from "../../core/helpers/section-parser";
import { GenerateProtocolDto, validateGenerateProtocolInput } from "../dtos/generate-protocol.dto";

export class GenerateProtocolUseCase {
  constructor(
    private readonly aiService: IAIService,
    private readonly protocolRegistry: IProtocolRegistry,
    private readonly logger: ILogger
  ) {}

  async execute(dto: GenerateProtocolDto): Promise<Protocol> {
    const reqId = Date.now();
    this.logger.info(`(${reqId}) Iniciando generación de protocolo tipo="${dto.tipo}"`);

    const strategy = this.protocolRegistry.get(dto.tipo);

    const validation = validateGenerateProtocolInput(dto, strategy.requiresParticipants);
    if (!validation.valid) {
      const errorMsg = validation.errors.join(" ");
      this.logger.error(`(${reqId}) Validación fallida: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const cleanInput = {
      materia: dto.materia.trim(),
      temas: dto.temas.map((t) => t.trim()).filter(Boolean),
      participantes: dto.participantes.map((p) => p.trim()).filter(Boolean),
    };

    const prompt = strategy.buildPrompt(cleanInput);
    this.logger.info(
      `(${reqId}) Prompt construido para materia="${cleanInput.materia}". Solicitando generación a IA...`
    );

    const startTime = Date.now();
    let rawText: string;
    try {
      rawText = await this.aiService.generateContent(prompt);
    } catch (err) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `(${reqId}) Error de IA tras ${duration} ms: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
      throw err;
    }

    const duration = Date.now() - startTime;
    this.logger.info(`(${reqId}) Respuesta recibida en ${duration} ms (longitud: ${rawText.length} caracteres)`);

    const sections = parsePreviewSections(rawText);
    const extractedFields = strategy.extractSections(rawText, cleanInput);

    const metadata: ProtocolMetadata = {
      materia: cleanInput.materia,
      temas: cleanInput.temas,
      participantes: cleanInput.participantes,
      tipo: dto.tipo,
      createdAt: new Date(),
    };

    this.logger.info(`(${reqId}) Protocolo procesado con éxito (${sections.length} secciones detectadas)`);
    return new Protocol(metadata, rawText, sections, extractedFields);
  }
}
