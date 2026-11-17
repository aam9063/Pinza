/**
 * Red: Pinza no puede hacer ni una petición de red. Recarga cada ventana
 * abierta y falla ante cualquier URL que no sea del protocolo de assets o IPC.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { connectToPinza, fail, findOpenWindowEntities, REPO_ROOT } from "./cdp.mjs";

const allowedPrefixes = ["tauri://", "http://tauri.localhost", "http://ipc.localhost", "ipc://"];
const allowedSchemes = ["asset:", "data:", "blob:"];

/**
 * En `pnpm dev:debug` las ventanas cargan del devUrl de Tauri (`next dev`) en vez
 * del protocolo de assets del build de producción. El websocket de HMR del
 * dev server mantiene una conexión viva, así que la espera válida es `load`,
 * no `networkidle`.
 */
async function devUrlPrefixes() {
  try {
    const raw = await readFile(join(REPO_ROOT, "src-tauri", "tauri.conf.json"), "utf8");
    const devUrl = JSON.parse(raw)?.build?.devUrl;

    if (typeof devUrl !== "string") {
      return [];
    }

    return [devUrl, devUrl.replace(/^http/, "ws")];
  } catch {
    return [];
  }
}

const browser = await connectToPinza();
const windows = await findOpenWindowEntities(browser);
const devPrefixes = await devUrlPrefixes();
const prefixes = [...allowedPrefixes, ...devPrefixes];

const offenders = [];

if (windows.length === 0) {
  await browser.close();
  fail("no hay ninguna ventana abierta; arranca la app con `pnpm dev:debug`");
  process.exit(process.exitCode);
}

for (const { name, page } of windows) {
  page.on("request", (request) => {
    const url = request.url();
    const allowed =
      allowedSchemes.some((scheme) => url.startsWith(scheme)) ||
      prefixes.some((prefix) => url.startsWith(prefix));

    if (!allowed) {
      offenders.push(`${name}: ${url}`);
    }
  });

  await page.reload({ waitUntil: "load", timeout: 30_000 });
  console.log(`✓ ${name} recargada`);
}

await browser.close();

if (offenders.length > 0) {
  for (const offender of offenders) {
    console.error(`✗ petición de red no permitida → ${offender}`);
  }
  process.exit(1);
}

console.log("✓ ninguna petición sale del protocolo de assets ni del IPC");
