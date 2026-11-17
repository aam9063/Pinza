/**
 * Red: Pinza no puede hacer ni una petición de red. Recarga cada ventana
 * abierta y falla ante cualquier URL que no sea del protocolo de assets o IPC.
 */
import { connectToPinza, fail, findOpenWindowEntities } from "./cdp.mjs";

const allowedPrefixes = ["tauri://", "http://tauri.localhost", "http://ipc.localhost", "ipc://"];
const allowedSchemes = ["asset:", "data:", "blob:"];

const browser = await connectToPinza();
const windows = await findOpenWindowEntities(browser);

if (windows.length === 0) {
  await browser.close();
  fail("no hay ninguna ventana abierta; arranca la app con `pnpm dev:debug`");
  process.exit(process.exitCode);
}

const offenders = [];

for (const { name, page } of windows) {
  page.on("request", (request) => {
    const url = request.url();
    const allowed =
      allowedSchemes.some((scheme) => url.startsWith(scheme)) ||
      allowedPrefixes.some((prefix) => url.startsWith(prefix));

    if (!allowed) {
      offenders.push(`${name}: ${url}`);
    }
  });

  await page.reload({ waitUntil: "networkidle" });
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
