import { ExportFile } from "../../core/interfaces/document-exporter.interface";
import { IFileDownloader } from "../../core/interfaces/file-downloader.interface";

export class BrowserFileDownloader implements IFileDownloader {
  async download(file: ExportFile): Promise<void> {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
