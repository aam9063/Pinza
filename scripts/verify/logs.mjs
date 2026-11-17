/** Vuelca la consola del WebView2 de cada ventana abierta durante unos segundos. */
import { connectToPinza, fail, findOpenWindowEntities } from "./cdp.mjs";

const seconds = Number(process.argv[2] ?? 10);

if (!Number.isFinite(seconds) || seconds <= 0) {
  fail("uso: pnpm verify:logs [segundos]");
  process.exit(process.exitCode);
}

const browser = await connectToPinza();
const windows = await findOpenWindowEntities(browser);

if (windows.length === 0) {
  await browser.close();
  fail("no hay ninguna ventana abierta; arranca la app con `pnpm dev:debug`");
  process.exit(process.exitCode);
}

for (const { name, page } of windows) {
  page.on("console", (message) => {
    console.log(`[${name}] ${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    console.log(`[${name}] pageerror: ${error.message}`);
  });
  console.log(`escuchando la consola de ${name}`);
}

await new Promise((resolve) => {
  setTimeout(resolve, seconds * 1000);
});

await browser.close();
console.log("fin de la captura de consola");
