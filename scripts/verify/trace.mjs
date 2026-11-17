/**
 * Traza de una animación: graba un escenario y señala las tareas de más de
 * 16 ms, que son las que rompen el presupuesto de 60 fps.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { TRACES_DIR, connectToPinza, ensureDirectory, fail, findWindowPage } from "./cdp.mjs";

const windowName = process.argv[2] ?? "line";
const scenario = process.argv[3] ?? "drop";
const FRAME_BUDGET_MS = 16;

const scenarios = {
  drop: async (page) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("pinza:verify-drop"));
    });
    await page.waitForTimeout(1200);
  },
  reveal: async (page) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("pinza:verify-reveal"));
    });
    await page.waitForTimeout(1200);
  },
  unhang: async (page) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("pinza:verify-unhang"));
    });
    await page.waitForTimeout(1200);
  },
  drag: async (page) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("pinza:verify-drag"));
    });
    await page.waitForTimeout(1200);
  },
};

const run = scenarios[scenario];

if (!run) {
  fail(`escenario desconocido: ${scenario}. Usa ${Object.keys(scenarios).join(", ")}.`);
  process.exit(process.exitCode);
}

await ensureDirectory(TRACES_DIR);

const browser = await connectToPinza();
const page = findWindowPage(browser, windowName);

if (!page) {
  await browser.close();
  fail(`la ventana ${windowName} no está abierta`);
  process.exit(process.exitCode);
}

const client = await page.context().newCDPSession(page);
const events = [];

client.on("Tracing.dataCollected", (payload) => {
  events.push(...payload.value);
});

await client.send("Tracing.start", {
  categories: ["devtools.timeline", "disabled-by-default-devtools.timeline"],
  transferMode: "ReportEvents",
});

await run(page);

const completed = new Promise((resolve) => {
  client.once("Tracing.tracingComplete", resolve);
});
await client.send("Tracing.end");
await completed;

await browser.close();

const longTasks = events
  .filter((event) => event.name === "RunTask" || event.name === "ThreadControllerImpl::RunTask")
  .map((event) => ({
    name: event.name,
    durationMs: (event.dur ?? 0) / 1000,
  }))
  .filter((event) => event.durationMs > FRAME_BUDGET_MS)
  .sort((left, right) => right.durationMs - left.durationMs);

const traceFile = join(TRACES_DIR, `${windowName}-${scenario}.json`);
await writeFile(traceFile, JSON.stringify({ windowName, scenario, events }));

console.log(`traza escrita en ${traceFile} (${events.length} eventos)`);

if (longTasks.length > 0) {
  for (const task of longTasks.slice(0, 10)) {
    console.error(`✗ ${task.name} de ${task.durationMs.toFixed(1)} ms, por encima de los 16 ms`);
  }
  process.exit(1);
}

console.log(`✓ ninguna tarea por encima de ${FRAME_BUDGET_MS} ms en el escenario ${scenario}`);
