/// <reference types="vite/client" />

interface Window {
  ipcRenderer?: {
    on: (channel: string, listener: (...args: unknown[]) => void) => void;
    off: (channel: string, listener: (...args: unknown[]) => void) => void;
    send: (channel: string, ...args: unknown[]) => void;
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  };
  electronAPI?: {
    openExternal: (url: string) => Promise<void>;
    generatePdf?: (params: { html: string; title: string }) => Promise<unknown>;
    convertDocxToPdf?: (params: { docxBase64: string; title: string }) => Promise<unknown>;
    renderProtocolPages?: (params: { docxBase64: string }) => Promise<{
      success: boolean;
      error?: string;
      pdfBase64?: string;
      pageImages?: string[];
      totalPages?: number;
    }>;
  };
}

