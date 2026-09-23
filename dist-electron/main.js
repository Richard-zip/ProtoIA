import { app as d, ipcMain as y, shell as j, BrowserWindow as E, Menu as B } from "electron";
import { createRequire as I } from "node:module";
import { fileURLToPath as C } from "node:url";
import e from "node:path";
import r from "node:fs";
import l from "node:child_process";
I(import.meta.url);
const v = e.dirname(C(import.meta.url));
process.env.APP_ROOT = e.join(v, "..");
const b = process.env.VITE_DEV_SERVER_URL, U = e.join(process.env.APP_ROOT, "dist-electron"), F = e.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = b ? e.join(process.env.APP_ROOT, "public") : F;
if (process.platform === "win32") {
  const n = e.join(d.getPath("userData"), "cache");
  d.setPath("cache", n);
}
let m;
function O() {
  B.setApplicationMenu(null), m = new E({
    title: "Agnes",
    icon: e.join(process.env.VITE_PUBLIC, "images/agnes.png"),
    autoHideMenuBar: !0,
    webPreferences: {
      preload: e.join(v, "preload.mjs")
    }
  }), m.removeMenu(), m.webContents.setWindowOpenHandler(({ url: n }) => ((n.startsWith("https:") || n.startsWith("http:")) && j.openExternal(n), { action: "deny" })), m.webContents.on("will-navigate", (n, o) => {
    !(b && o.startsWith(b)) && (o.startsWith("https:") || o.startsWith("http:")) && (n.preventDefault(), j.openExternal(o));
  }), m.webContents.on("did-finish-load", () => {
    m == null || m.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), m.webContents.on("did-fail-load", (n, o, a, i) => {
    console.error(`Renderer failed to load (${o}): ${a} - ${i}`);
  }), b ? m.loadURL(b) : m.loadFile(e.join(F, "index.html"));
}
y.handle("open-external-url", async (n, o) => {
  typeof o == "string" && (o.startsWith("https:") || o.startsWith("http:")) && await j.openExternal(o);
});
y.handle("load-template", async (n, o) => {
  try {
    const a = typeof o == "string" ? o : "", i = e.basename(decodeURIComponent(a)), t = [
      e.join(F, "templates"),
      e.join(process.env.APP_ROOT, "dist", "templates"),
      e.join(process.env.APP_ROOT, "public", "templates"),
      e.join(process.resourcesPath || "", "templates"),
      e.join(process.resourcesPath || "", "app.asar", "dist", "templates"),
      e.join(d.getAppPath(), "dist", "templates"),
      e.join(d.getAppPath(), "templates")
    ];
    for (const p of t) {
      const c = e.join(p, i);
      if (r.existsSync(c))
        return { success: !0, bufferBase64: (await r.promises.readFile(c)).toString("base64") };
    }
    return {
      success: !1,
      error: `No se encontró la plantilla "${i}" en las rutas de la aplicación.`
    };
  } catch (a) {
    return console.error("[Main] Error al cargar plantilla de Word:", a), {
      success: !1,
      error: a instanceof Error ? a.message : String(a)
    };
  }
});
function _() {
  const o = !d.isPackaged ? e.join(v, "..") : process.resourcesPath, a = [
    e.join(o, "bin", "libreoffice"),
    e.join(process.resourcesPath || "", "bin", "libreoffice"),
    e.join(v, "..", "bin", "libreoffice")
  ];
  for (const i of a) {
    if (!i) continue;
    const t = e.join(i, "program", "soffice.exe");
    if (process.platform === "win32" && r.existsSync(t))
      return { executable: t, argsPrefix: [] };
    const p = e.join(i, "App", "libreoffice", "program", "soffice.exe");
    if (process.platform === "win32" && r.existsSync(p))
      return { executable: p, argsPrefix: [] };
    const c = e.join(i, "soffice.exe");
    if (process.platform === "win32" && r.existsSync(c))
      return { executable: c, argsPrefix: [] };
    const s = e.join(i, "soffice");
    if (r.existsSync(s))
      return { executable: s, argsPrefix: [] };
    const f = e.join(i, "squashfs-root", "AppRun");
    if (r.existsSync(f))
      return { executable: f, argsPrefix: [] };
  }
  if (process.platform === "win32") {
    const i = [
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
      e.join(process.env.LOCALAPPDATA || "", "Programs", "LibreOffice", "program", "soffice.exe"),
      e.join(process.env.ProgramFiles || "C:\\Program Files", "LibreOffice", "program", "soffice.exe")
    ];
    for (const t of i)
      if (r.existsSync(t)) return { executable: t, argsPrefix: [] };
    try {
      const t = l.execSync("where soffice.exe || where soffice", { encoding: "utf-8" }).split(/\r?\n/)[0].trim();
      if (t && r.existsSync(t))
        return { executable: t, argsPrefix: [] };
    } catch {
    }
  } else if (process.platform === "darwin") {
    const i = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
    if (r.existsSync(i)) return { executable: i, argsPrefix: [] };
  } else {
    const i = ["/usr/bin/soffice", "/usr/bin/libreoffice", "/usr/local/bin/soffice"];
    for (const t of i)
      if (r.existsSync(t)) return { executable: t, argsPrefix: [] };
    try {
      const t = l.execSync("which soffice || which libreoffice", { encoding: "utf-8" }).trim();
      if (t && r.existsSync(t))
        return { executable: t, argsPrefix: [] };
    } catch {
    }
  }
  return null;
}
async function k(n, o, a) {
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
  return new Promise((t, p) => {
    l.execFile(
      n.executable,
      i,
      {
        timeout: 9e4,
        env: {
          ...process.env,
          // Perfil de usuario aislado para evitar conflictos de bloqueo de archivos
          UserInstallation: `file://${e.join(a, ".lo-profile").replace(/\\/g, "/")}`,
          HOME: a
        }
      },
      (c, s, f) => {
        c ? (console.error("[LibreOffice] Error en conversión a PDF:", c, f, s), p(c)) : t();
      }
    );
  });
}
async function D(n) {
  try {
    let o = !1, a = !1;
    try {
      l.execSync("which pdftotext", { stdio: "ignore" }), o = !0;
    } catch {
    }
    try {
      l.execSync("which pdfinfo", { stdio: "ignore" }), a = !0;
    } catch {
    }
    if (!o || !a) return;
    let i = !0;
    for (; i; ) {
      i = !1;
      const p = l.execFileSync("pdfinfo", [n], { encoding: "utf8" }).match(/Pages:\s+(\d+)/);
      if (!p) break;
      const c = parseInt(p[1], 10);
      if (c <= 1) break;
      const s = l.execFileSync(
        "pdftotext",
        ["-f", String(c), "-l", String(c), n, "-"],
        { encoding: "utf8" }
      );
      if (!s || s.trim().length === 0) {
        const f = `${n}.trimmed.pdf`;
        let P = !1;
        try {
          l.execSync("which gs", { stdio: "ignore" }), l.execFileSync(
            "gs",
            [
              "-sDEVICE=pdfwrite",
              "-dNOPAUSE",
              "-dBATCH",
              "-dSAFER",
              "-dFirstPage=1",
              `-dLastPage=${c - 1}`,
              `-sOutputFile=${f}`,
              n
            ],
            { stdio: "ignore" }
          ), r.existsSync(f) && (await r.promises.rename(f, n), P = !0, i = !0);
        } catch {
        }
        if (!P)
          try {
            if (c === 2)
              l.execFileSync("pdfseparate", ["-f", "1", "-l", "1", n, f]), r.existsSync(f) && (await r.promises.rename(f, n), i = !0);
            else {
              const w = e.dirname(n), u = e.join(w, `blank-trim-%d-${Date.now()}.pdf`);
              l.execFileSync("pdfseparate", ["-f", "1", "-l", String(c - 1), n, u]);
              const g = [];
              for (let h = 1; h < c; h++)
                g.push(u.replace("%d", String(h)));
              l.execFileSync("pdfunite", [...g, f]);
              for (const h of g)
                r.promises.unlink(h).catch(() => {
                });
              r.existsSync(f) && (await r.promises.rename(f, n), i = !0);
            }
          } catch {
          }
      }
    }
  } catch (o) {
    console.warn("[removeTrailingBlankPagesFromPdf] Error al recortar páginas en blanco:", o);
  }
}
y.handle("convert-docx-to-pdf", async (n, { docxBase64: o }) => {
  const a = _();
  if (!a)
    throw new Error("LIBREOFFICE_NOT_FOUND");
  const i = `agnes-lo-${Date.now()}-${Math.random().toString(36).slice(2)}`, t = e.join(d.getPath("temp"), i);
  await r.promises.mkdir(t, { recursive: !0 });
  const p = e.join(t, "documento.docx"), c = Buffer.from(o, "base64");
  await r.promises.writeFile(p, c);
  try {
    await k(a, p, t);
    const s = e.join(t, "documento.pdf");
    if (!r.existsSync(s))
      throw new Error("No se encontró el archivo PDF resultante de la exportación.");
    return await D(s), await r.promises.readFile(s);
  } finally {
    r.promises.rm(t, { recursive: !0, force: !0 }).catch(() => {
    });
  }
});
y.handle("render-protocol-pages", async (n, { docxBase64: o }) => {
  const a = _();
  if (!a)
    return { success: !1, error: "LIBREOFFICE_NOT_FOUND" };
  const i = `agnes-lo-pages-${Date.now()}-${Math.random().toString(36).slice(2)}`, t = e.join(d.getPath("temp"), i);
  await r.promises.mkdir(t, { recursive: !0 });
  const p = e.join(t, "documento.docx"), c = Buffer.from(o, "base64");
  await r.promises.writeFile(p, c);
  try {
    await k(a, p, t);
    const s = e.join(t, "documento.pdf");
    if (!r.existsSync(s))
      return { success: !1, error: "OUTPUT_PDF_NOT_FOUND" };
    await D(s);
    const P = (await r.promises.readFile(s)).toString("base64"), w = [];
    let u = !1;
    try {
      l.execSync("which pdftoppm", { stdio: "ignore" }), u = !0;
    } catch {
      u = !1;
    }
    if (u)
      try {
        const g = e.join(t, "page");
        l.execFileSync("pdftoppm", ["-png", "-r", "150", s, g], {
          timeout: 15e3
        });
        const T = (await r.promises.readdir(t)).filter((x) => x.startsWith("page-") && x.endsWith(".png")).sort((x, S) => {
          const R = parseInt(x.replace("page-", "").replace(".png", ""), 10) || 0, A = parseInt(S.replace("page-", "").replace(".png", ""), 10) || 0;
          return R - A;
        });
        for (const x of T) {
          const S = await r.promises.readFile(e.join(t, x));
          w.push(`data:image/png;base64,${S.toString("base64")}`);
        }
      } catch (g) {
        console.warn("[render-protocol-pages] pdftoppm no disponible o falló:", g);
      }
    return {
      success: !0,
      pdfBase64: P,
      pageImages: w,
      totalPages: w.length
    };
  } catch (s) {
    return { success: !1, error: s instanceof Error ? s.message : String(s) };
  } finally {
    r.promises.rm(t, { recursive: !0, force: !0 }).catch(() => {
    });
  }
});
y.handle("generate-pdf-from-html", async (n, { html: o, title: a }) => {
  const i = new E({
    show: !1,
    width: 850,
    height: 1100,
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      sandbox: !1
    }
  }), t = e.join(
    d.getPath("temp"),
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
      font-family: "Times New Roman", Times, "Liberation Serif", serif !important;
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
    return await r.promises.writeFile(t, p, "utf-8"), await i.loadFile(t), await new Promise((s) => setTimeout(s, 500)), await i.webContents.printToPDF({
      pageSize: "Letter",
      printBackground: !0,
      preferCSSPageSize: !0,
      margins: { marginType: "none" }
    });
  } finally {
    i.close(), r.promises.unlink(t).catch(() => {
    });
  }
});
d.on("window-all-closed", () => {
  process.platform !== "darwin" && (d.quit(), m = null);
});
d.on("activate", () => {
  E.getAllWindows().length === 0 && O();
});
d.whenReady().then(O);
export {
  U as MAIN_DIST,
  F as RENDERER_DIST,
  b as VITE_DEV_SERVER_URL
};
