import { Protocol } from "../../core/entities/protocol.entity";
import { IDocumentExporter } from "../../core/interfaces/document-exporter.interface";
import { IFileDownloader } from "../../core/interfaces/file-downloader.interface";
import { ILogger } from "../../core/interfaces/logger.interface";

export class ExportProtocolUseCase {
  constructor(
    private readonly documentExporter: IDocumentExporter,
    private readonly fileDownloader: IFileDownloader,
    private readonly logger: ILogger
  ) {}

  async execute(protocol: Protocol, options?: Record<string, unknown>): Promise<void> {
    this.logger.info(`Iniciando exportación en formato ${this.documentExporter.format}...`);
    try {
      const exportFile = await this.documentExporter.exportDocument(protocol, options);
      this.logger.info(`Archivo generado: "${exportFile.fileName}". Iniciando descarga...`);
      await this.fileDownloader.download(exportFile);
      this.logger.info(`Descarga completada con éxito: "${exportFile.fileName}"`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error al exportar documento: ${errorMsg}`, err);
      throw err;
    }
  }
}
