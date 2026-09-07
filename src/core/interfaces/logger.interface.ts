export interface ILogger {
  info(message: string): void;
  error(message: string, error?: unknown): void;
  subscribe(listener: (entry: string) => void): () => void;
  getRecentLogs(): string[];
}
