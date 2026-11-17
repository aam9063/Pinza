/**
 * Arranca la app en modo depuración: WebView2 expuesto por CDP en el 9222 y
 * carpetas temporales para ajustes y capturas, nunca las del usuario.
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dataDir = mkdtempSync(join(tmpdir(), "pinza-data-"));
const watchDir = mkdtempSync(join(tmpdir(), "pinza-watch-"));

const env = {
  ...process.env,
  WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9222",
  PINZA_DATA_DIR: dataDir,
  PINZA_WATCH_DIR: watchDir,
};

console.log(`datos:   ${dataDir}`);
console.log(`capturas: ${watchDir}`);
console.log("CDP:     http://127.0.0.1:9222");

const child = spawn("pnpm", ["tauri", "dev"], { env, shell: true, stdio: "inherit" });

const stop = () => {
  child.kill();
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
