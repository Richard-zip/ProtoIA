import { app as s, ipcMain as m, shell as r, BrowserWindow as p, Menu as f } from "electron";
import { createRequire as w } from "node:module";
import { fileURLToPath as R } from "node:url";
import o from "node:path";
w(import.meta.url);
const l = o.dirname(R(import.meta.url));
process.env.APP_ROOT = o.join(l, "..");
const i = process.env.VITE_DEV_SERVER_URL, u = o.join(process.env.APP_ROOT, "dist-electron"), c = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = i ? o.join(process.env.APP_ROOT, "public") : c;
if (process.platform === "win32") {
  const n = o.join(s.getPath("userData"), "cache");
  s.setPath("cache", n);
}
let e;
function d() {
  f.setApplicationMenu(null), e = new p({
    title: "Agnes",
    icon: o.join(process.env.VITE_PUBLIC, "images/agnes.png"),
    autoHideMenuBar: !0,
    webPreferences: {
      preload: o.join(l, "preload.mjs")
    }
  }), e.removeMenu(), e.webContents.setWindowOpenHandler(({ url: n }) => ((n.startsWith("https:") || n.startsWith("http:")) && r.openExternal(n), { action: "deny" })), e.webContents.on("will-navigate", (n, t) => {
    !(i && t.startsWith(i)) && (t.startsWith("https:") || t.startsWith("http:")) && (n.preventDefault(), r.openExternal(t));
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), e.webContents.on("did-fail-load", (n, t, a, h) => {
    console.error(`Renderer failed to load (${t}): ${a} - ${h}`);
  }), i ? e.loadURL(i) : e.loadFile(o.join(c, "index.html"));
}
m.handle("open-external-url", async (n, t) => {
  typeof t == "string" && (t.startsWith("https:") || t.startsWith("http:")) && await r.openExternal(t);
});
s.on("window-all-closed", () => {
  process.platform !== "darwin" && (s.quit(), e = null);
});
s.on("activate", () => {
  p.getAllWindows().length === 0 && d();
});
s.whenReady().then(d);
export {
  u as MAIN_DIST,
  c as RENDERER_DIST,
  i as VITE_DEV_SERVER_URL
};
