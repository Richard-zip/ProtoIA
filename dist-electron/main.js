import { app, ipcMain, shell, BrowserWindow, Menu } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
if (process.platform === "win32") {
  const cacheDir = path.join(app.getPath("userData"), "cache");
  app.setPath("cache", cacheDir);
}
let win;
function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    title: "Agnes",
    icon: path.join(process.env.VITE_PUBLIC, "images/agnes.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.removeMenu();
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:") || url.startsWith("http:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, navigationUrl) => {
    const isDevServer = VITE_DEV_SERVER_URL && navigationUrl.startsWith(VITE_DEV_SERVER_URL);
    if (!isDevServer && (navigationUrl.startsWith("https:") || navigationUrl.startsWith("http:"))) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Renderer failed to load (${errorCode}): ${errorDescription} - ${validatedURL}`);
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
ipcMain.handle("open-external-url", async (_event, url) => {
  if (typeof url === "string" && (url.startsWith("https:") || url.startsWith("http:"))) {
    await shell.openExternal(url);
  }
});
ipcMain.handle("generate-pdf-from-html", async (_event, { html, title }) => {
  const workerWin = new BrowserWindow({
    show: false,
    width: 850,
    height: 1100,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  const tempHtmlPath = path.join(
    app.getPath("temp"),
    `agnes-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.html`
  );
  try {
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title || "Protocolo Académico"}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 0;
    }
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    }
    .docx-wrapper {
      background: #ffffff !important;
      padding: 0 !important;
      margin: 0 !important;
      display: block !important;
    }
    section.docx {
      box-shadow: none !important;
      margin: 0 auto !important;
      background: #ffffff !important;
      page-break-after: always !important;
      break-after: page !important;
    }
    section.docx:last-of-type {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
    await fs.promises.writeFile(tempHtmlPath, fullHtml, "utf-8");
    await workerWin.loadFile(tempHtmlPath);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const pdfBuffer = await workerWin.webContents.printToPDF({
      pageSize: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: "none" }
    });
    return pdfBuffer;
  } finally {
    workerWin.close();
    fs.promises.unlink(tempHtmlPath).catch(() => {
    });
  }
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
