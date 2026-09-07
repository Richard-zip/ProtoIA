import { ILogger } from "../../core/interfaces/logger.interface";

export class EventLoggerService implements ILogger {
  private readonly listeners: Set<(entry: string) => void> = new Set();
  private readonly buffer: string[] = [];
  private readonly maxBufferSize: number;

  constructor(maxBufferSize = 200) {
    this.maxBufferSize = maxBufferSize;
  }

  info(message: string): void {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [INFO] ${message}`;
    console.info(entry);
    this.pushLog(entry);
  }

  error(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    const errDetails = error instanceof Error ? ` - ${error.stack || error.message}` : "";
    const entry = `[${timestamp}] [ERROR] ${message}${errDetails}`;
    console.error(entry);
    this.pushLog(entry);
  }

  subscribe(listener: (entry: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getRecentLogs(): string[] {
    return [...this.buffer];
  }

  private pushLog(entry: string): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
    this.listeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (err) {
        console.error("Error in log listener:", err);
      }
    });
  }
}
