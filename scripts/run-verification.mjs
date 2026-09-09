import { build } from "vite";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const outDir = "dist-test";
  try {
    await build({
      logLevel: "warn",
      build: {
        ssr: "scripts/verify-architecture.ts",
        outDir,
        emptyOutDir: true,
        rollupOptions: {
          external: [/^node:/, "fs", "path", "child_process"],
          output: { entryFileNames: "verify.js" },
        },
      },
    });

    const child = spawn("node", [path.join(outDir, "verify.js")], {
      stdio: "inherit",
    });

    child.on("close", async (code) => {
      await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
      process.exit(code ?? 0);
    });
  } catch (err) {
    console.error("Error al compilar o ejecutar tests de arquitectura:", err);
    await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
    process.exit(1);
  }
}

main();
