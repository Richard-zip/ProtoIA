/**
 * Abre una URL de forma segura en el navegador externo predeterminado del sistema operativo
 * (Chrome, Firefox, Edge, etc.) evitando que la aplicación Electron navegue internamente
 * hacia páginas de terceros como Google AI Studio.
 */
export async function openExternalLink(url: string): Promise<void> {
  if (typeof window !== "undefined" && window.electronAPI?.openExternal) {
    try {
      await window.electronAPI.openExternal(url);
      return;
    } catch (err) {
      console.warn("Error en electronAPI.openExternal:", err);
    }
  }

  if (typeof window !== "undefined" && window.ipcRenderer?.invoke) {
    try {
      await window.ipcRenderer.invoke("open-external-url", url);
      return;
    } catch (err) {
      console.warn("Error en ipcRenderer.invoke('open-external-url'):", err);
    }
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
