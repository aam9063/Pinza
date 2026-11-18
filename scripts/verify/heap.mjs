/** Foto del heap de una ventana, para vigilar la memoria en reposo. */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { HEAPS_DIR, connectToPinza, ensureDirectory, fail, findWindowPage } from "./cdp.mjs";

const windowName = process.argv[2] ?? "line";

await ensureDirectory(HEAPS_DIR);

const browser = await connectToPinza();
const page = findWindowPage(browser, windowName);

if (!page) {
  await browser.close();
  fail(`la ventana ${windowName} no está abierta`);
  process.exit(process.exitCode);
}

const client = await page.context().newCDPSession(page);
const chunks = [];

client.on("HeapProfiler.addHeapSnapshotChunk", (payload) => {
  chunks.push(payload.chunk);
});

await client.send("HeapProfiler.enable");
await client.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });

const target = join(HEAPS_DIR, `${windowName}.heapsnapshot`);
await writeFile(target, chunks.join(""));

console.log(`✓ heap de ${windowName} escrito en ${target} (${chunks.length} trozos)`);

await browser.close();
