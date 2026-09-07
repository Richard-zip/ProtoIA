import { Protocol } from "../entities/protocol.entity";

export interface ExportFile {
  blob: Blob;
  fileName: string;
  mimeType: string;
}

export interface IDocumentExporter {
  readonly format: string; // e.g. "docx", "pdf", "markdown"
  exportDocument(protocol: Protocol, options?: Record<string, unknown>): Promise<ExportFile>;
}
