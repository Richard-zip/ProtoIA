import { ExportFile } from "./document-exporter.interface";

export interface IFileDownloader {
  download(file: ExportFile): Promise<void>;
}
