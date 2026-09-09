import { app as l, ipcMain as b, shell as y, BrowserWindow as S, Menu as I } from "electron";
import { createRequire as B } from "node:module";
import { fileURLToPath as C } from "node:url";
import t from "node:path";
import r from "node:fs";
import u from "node:child_process";
B(import.meta.url);
const h = t.dirname(C(import.meta.url));
process.env.APP_ROOT = t.join(h, "..");
const d = process.env.VITE_DEV_SERVER_URL, U = t.join(process.env.APP_ROOT, "dist-electron"), _ = t.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = d ? t.join(process.env.APP_ROOT, "public") : _;
if (process.platform === "win32") {
  const n = t.join(l.getPath("userData"), "cache");
  l.setPath("cache", n);
}
let c;
function E() {
  I.setApplicationMenu(null), c = new S({
    title: "Agnes",
    icon: t.join(process.env.VITE_PUBLIC, "images/agnes.png"),
    autoHideMenuBar: !0,
    webPreferences: {
      preload: t.join(h, "preload.mjs")
    }
  }), c.removeMenu(), c.webContents.setWindowOpenHandler(({ url: n }) => ((n.startsWith("https:") || n.startsWith("http:")) && y.openExternal(n), { action: "deny" })), c.webContents.on("will-navigate", (n, o) => {
    !(d && o.startsWith(d)) && (o.startsWith("https:") || o.startsWith("http:")) && (n.preventDefault(), y.openExternal(o));
  }), c.webContents.on("did-finish-load", () => {
    c == null || c.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), c.webContents.on("did-fail-load", (n, o, a, i) => {
    console.error(`Renderer failed to load (${o}): ${a} - ${i}`);
  }), d ? c.loadURL(d) : c.loadFile(t.join(_, "index.html"));
}
b.handle("open-external-url", async (n, o) => {
  typeof o == "string" && (o.startsWith("https:") || o.startsWith("http:")) && await y.openExternal(o);
});
function j() {
  const o = !l.isPackaged ? t.join(h, "..") : process.resourcesPath, a = [
    t.join(o, "bin", "libreoffice"),
    t.join(process.resourcesPath || "", "bin", "libreoffice"),
    t.join(h, "..", "bin", "libreoffice")
  ];
  for (const i of a) {
    if (!i) continue;
    const e = t.join(i, "program", "soffice.exe");
    if (process.platform === "win32" && r.existsSync(e))
      return { executable: e, argsPrefix: [] };
    const p = t.join(i, "soffice");
    if (r.existsSync(p))
      return { executable: p, argsPrefix: [] };
    const f = t.join(i, "squashfs-root", "AppRun");
    if (r.existsSync(f))
      return { executable: f, argsPrefix: [] };
  }
  if (process.platform === "win32") {
    const i = [
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"
    ];
    for (const e of i)
      if (r.existsSync(e)) return { executable: e, argsPrefix: [] };
  } else if (process.platform === "darwin") {
    const i = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
    if (r.existsSync(i)) return { executable: i, argsPrefix: [] };
  } else {
    const i = ["/usr/bin/soffice", "/usr/bin/libreoffice", "/usr/local/bin/soffice"];
    for (const e of i)
      if (r.existsSync(e)) return { executable: e, argsPrefix: [] };
    try {
      const e = u.execSync("which soffice || which libreoffice", { encoding: "utf-8" }).trim();
      if (e && r.existsSync(e))
        return { executable: e, argsPrefix: [] };
    } catch {
    }
  }
  return null;
}
async function O(n, o, a) {
  const i = [
    ...n.argsPrefix,
    "--headless",
    "--invisible",
    "--nodefault",
    "--view",
    "--nolockcheck",
    "--nologo",
    "--norestore",
    "--convert-to",
    "pdf:writer_pdf_Export",
    "--outdir",
    a,
    o
  ];
  return new Promise((e, p) => {
    u.execFile(
      n.executable,
      i,
      {
        timeout: 9e4,
        env: {
          ...process.env,
          // Perfil de usuario aislado para evitar conflictos de bloqueo de archivos
          UserInstallation: `file://${t.join(a, ".lo-profile").replace(/\\/g, "/")}`,
          HOME: a
        }
      },
      (f, s, g) => {
        f ? (console.error("[LibreOffice] Error en conversión a PDF:", f, g, s), p(f)) : e();
      }
    );
  });
}
b.handle("convert-docx-to-pdf", async (n, { docxBase64: o }) => {
  const a = j();
  if (!a)
    throw new Error("LIBREOFFICE_NOT_FOUND");
  const i = `agnes-lo-${Date.now()}-${Math.random().toString(36).slice(2)}`, e = t.join(l.getPath("temp"), i);
  await r.promises.mkdir(e, { recursive: !0 });
  const p = t.join(e, "documento.docx"), f = Buffer.from(o, "base64");
  await r.promises.writeFile(p, f);
  try {
    await O(a, p, e);
    const s = t.join(e, "documento.pdf");
    if (!r.existsSync(s))
      throw new Error("LibreOffice finalizó pero no se encontró el archivo documento.pdf resultante.");
    return await r.promises.readFile(s);
  } finally {
    r.promises.rm(e, { recursive: !0, force: !0 }).catch(() => {
    });
  }
});
b.handle("render-protocol-pages", async (n, { docxBase64: o }) => {
  const a = j();
  if (!a)
    return { success: !1, error: "LIBREOFFICE_NOT_FOUND" };
  const i = `agnes-lo-pages-${Date.now()}-${Math.random().toString(36).slice(2)}`, e = t.join(l.getPath("temp"), i);
  await r.promises.mkdir(e, { recursive: !0 });
  const p = t.join(e, "documento.docx"), f = Buffer.from(o, "base64");
  await r.promises.writeFile(p, f);
  try {
    await O(a, p, e);
    const s = t.join(e, "documento.pdf");
    if (!r.existsSync(s))
      return { success: !1, error: "OUTPUT_PDF_NOT_FOUND" };
    const k = (await r.promises.readFile(s)).toString("base64"), w = [];
    let x = !1;
    try {
      u.execSync("which pdftoppm", { stdio: "ignore" }), x = !0;
    } catch {
      x = !1;
    }
    if (x)
      try {
        const v = t.join(e, "page");
        u.execFileSync("pdftoppm", ["-png", "-r", "150", s, v], {
          timeout: 15e3
        });
        const D = (await r.promises.readdir(e)).filter((m) => m.startsWith("page-") && m.endsWith(".png")).sort((m, P) => {
          const F = parseInt(m.replace("page-", "").replace(".png", ""), 10) || 0, R = parseInt(P.replace("page-", "").replace(".png", ""), 10) || 0;
          return F - R;
        });
        for (const m of D) {
          const P = await r.promises.readFile(t.join(e, m));
          w.push(`data:image/png;base64,${P.toString("base64")}`);
        }
      } catch (v) {
        console.warn("[render-protocol-pages] pdftoppm no disponible o falló:", v);
      }
    return {
      success: !0,
      pdfBase64: k,
      pageImages: w,
      totalPages: w.length
    };
  } catch (s) {
    return { success: !1, error: s instanceof Error ? s.message : String(s) };
  } finally {
    r.promises.rm(e, { recursive: !0, force: !0 }).catch(() => {
    });
  }
});
b.handle("generate-pdf-from-html", async (n, { html: o, title: a }) => {
  const i = new S({
    show: !1,
    width: 850,
    height: 1100,
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      sandbox: !1
    }
  }), e = t.join(
    l.getPath("temp"),
    `agnes-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.html`
  );
  try {
    const p = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${a || "Protocolo Académico"}</title>
  <style>
    @page {
      size: letter portrait;
      margin-top: 16mm;
      margin-bottom: 16mm;
      margin-left: 0;
      margin-right: 0;
    }

    @page :first {
      margin-top: 0;
      margin-bottom: 0;
      margin-left: 0;
      margin-right: 0;
    }

    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: "Calibri", "Carlito", "Segoe UI", Arial, "Helvetica Neue", Helvetica, sans-serif !important;
      -webkit-font-smoothing: antialiased !important;
      text-rendering: optimizeLegibility !important;
    }

    .docx-wrapper {
      background: #ffffff !important;
      padding: 0 !important;
      margin: 0 !important;
      display: block !important;
    }

    /* Contenedor de páginas de Word: paginación natural sin deformar anchos ni márgenes */
    section.docx {
      box-shadow: none !important;
      margin: 0 auto !important;
      background: #ffffff !important;
      display: block !important;
      position: relative !important;
      overflow: visible !important;
      min-height: auto !important;
      height: auto !important;
    }

    /* Encabezado institucional: contiene el fondo/banner en la primera página sin invadir páginas posteriores */
    header {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 792pt !important;
      max-height: 792pt !important;
      overflow: hidden !important;
      pointer-events: none !important;
      z-index: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    header p {
      margin: 0 !important;
      padding: 0 !important;
    }

    header svg {
      margin-top: 0 !important;
      max-height: 792pt !important;
      height: 792pt !important;
    }

    /* Contenedor principal de la tabla institucional */
    article {
      position: relative !important;
      z-index: 1 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* Formato de tabla: bordes nítidos, evita filas divididas y desalineación */
    table {
      border-collapse: collapse !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
      table-layout: fixed !important;
      width: 100% !important;
    }

    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    td, th {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      vertical-align: top !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }

    /* Párrafos y protección contra líneas huérfanas y viudas */
    p {
      orphans: 2 !important;
      widows: 2 !important;
    }

    /* Pie de página institucional */
    footer {
      position: relative !important;
      z-index: 1 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Máxima nitidez y fidelidad para logos y gráficos raster/vectoriales */
    img, image, svg {
      image-rendering: -webkit-optimize-contrast !important;
      image-rendering: high-quality !important;
    }
  </style>
</head>
<body>
  ${o}
</body>
</html>`;
    return await r.promises.writeFile(e, p, "utf-8"), await i.loadFile(e), await new Promise((s) => setTimeout(s, 500)), await i.webContents.printToPDF({
      pageSize: "Letter",
      printBackground: !0,
      preferCSSPageSize: !0,
      margins: { marginType: "none" }
    });
  } finally {
    i.close(), r.promises.unlink(e).catch(() => {
    });
  }
});
l.on("window-all-closed", () => {
  process.platform !== "darwin" && (l.quit(), c = null);
});
l.on("activate", () => {
  S.getAllWindows().length === 0 && E();
});
l.whenReady().then(E);
export {
  U as MAIN_DIST,
  _ as RENDERER_DIST,
  d as VITE_DEV_SERVER_URL
};
