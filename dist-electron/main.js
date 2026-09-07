import { app as a, ipcMain as m, shell as l, BrowserWindow as c, Menu as b } from "electron";
import { createRequire as P } from "node:module";
import { fileURLToPath as v } from "node:url";
import n from "node:path";
import f from "node:fs";
P(import.meta.url);
const d = n.dirname(v(import.meta.url));
process.env.APP_ROOT = n.join(d, "..");
const i = process.env.VITE_DEV_SERVER_URL, D = n.join(process.env.APP_ROOT, "dist-electron"), h = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = i ? n.join(process.env.APP_ROOT, "public") : h;
if (process.platform === "win32") {
  const o = n.join(a.getPath("userData"), "cache");
  a.setPath("cache", o);
}
let e;
function w() {
  b.setApplicationMenu(null), e = new c({
    title: "Agnes",
    icon: n.join(process.env.VITE_PUBLIC, "images/agnes.png"),
    autoHideMenuBar: !0,
    webPreferences: {
      preload: n.join(d, "preload.mjs")
    }
  }), e.removeMenu(), e.webContents.setWindowOpenHandler(({ url: o }) => ((o.startsWith("https:") || o.startsWith("http:")) && l.openExternal(o), { action: "deny" })), e.webContents.on("will-navigate", (o, t) => {
    !(i && t.startsWith(i)) && (t.startsWith("https:") || t.startsWith("http:")) && (o.preventDefault(), l.openExternal(t));
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), e.webContents.on("did-fail-load", (o, t, s, r) => {
    console.error(`Renderer failed to load (${t}): ${s} - ${r}`);
  }), i ? e.loadURL(i) : e.loadFile(n.join(h, "index.html"));
}
m.handle("open-external-url", async (o, t) => {
  typeof t == "string" && (t.startsWith("https:") || t.startsWith("http:")) && await l.openExternal(t);
});
m.handle("generate-pdf-from-html", async (o, { html: t, title: s }) => {
  const r = new c({
    show: !1,
    width: 850,
    height: 1100,
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      sandbox: !0
    }
  }), p = n.join(
    a.getPath("temp"),
    `agnes-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.html`
  );
  try {
    const g = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${s || "Protocolo Académico"}</title>
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
  ${t}
</body>
</html>`;
    return await f.promises.writeFile(p, g, "utf-8"), await r.loadFile(p), await new Promise((u) => setTimeout(u, 350)), await r.webContents.printToPDF({
      pageSize: "Letter",
      printBackground: !0,
      preferCSSPageSize: !0,
      margins: { marginType: "none" }
    });
  } finally {
    r.close(), f.promises.unlink(p).catch(() => {
    });
  }
});
a.on("window-all-closed", () => {
  process.platform !== "darwin" && (a.quit(), e = null);
});
a.on("activate", () => {
  c.getAllWindows().length === 0 && w();
});
a.whenReady().then(w);
export {
  D as MAIN_DIST,
  h as RENDERER_DIST,
  i as VITE_DEV_SERVER_URL
};
