/** Captura una ventana concreta (o las cuatro) del WebView2 en marcha. */
import { join } from "node:path";

import {
  SHOTS_DIR,
  WINDOW_NAMES,
  connectToPinza,
  ensureDirectory,
  fail,
  findWindowPage,
} from "./cdp.mjs";

const requested = process.argv[2] ? [process.argv[2]] : WINDOW_NAMES;
const unknown = requested.filter((name) => !WINDOW_NAMES.includes(name));

if (unknown.length > 0) {
  fail(`ventana desconocida: ${unknown.join(", ")}. Usa ${WINDOW_NAMES.join(", ")}.`);
  process.exit(process.exitCode);
}

await ensureDirectory(SHOTS_DIR);

const browser = await connectToPinza();
const missing = [];
let captured = 0;

for (const name of requested) {
  const page = findWindowPage(browser, name);

  if (!page) {
    missing.push(name);
    continue;
  }

  const target = join(SHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: target });
  console.log(`✓ ${name} → ${target}`);
  captured += 1;
}

await browser.close();

if (missing.length > 0) {
  fail(
    `estas ventanas no están abiertas: ${missing.join(", ")}. Abre la app con \`pnpm dev:debug\` (las ventanas editor, settings y onboarding se abren bajo demanda).`,
  );
}

if (captured === 0) {
  fail("no se capturó ninguna ventana");
}
