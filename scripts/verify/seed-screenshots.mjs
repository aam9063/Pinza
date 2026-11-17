/**
 * Simula capturas reales: copia las fixture una a una en la carpeta vigilada,
 * dejando tiempo entre copias para que el vigilante las vea llegar.
 */
import { copyFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { REPO_ROOT, fail } from "./cdp.mjs";

const FIXTURES_DIR = join(REPO_ROOT, "e2e", "fixtures", "screenshots");
const PAUSE_MS = Number(process.env.PINZA_SEED_PAUSE_MS ?? 900);

const watchDir = process.env.PINZA_WATCH_DIR;

if (!watchDir) {
  fail("falta PINZA_WATCH_DIR; usa la carpeta temporal que imprime `pnpm dev:debug`");
  process.exit(process.exitCode);
}

const fixtures = (await readdir(FIXTURES_DIR)).filter((name) => name.endsWith(".png")).sort();

if (fixtures.length === 0) {
  fail(`no hay fixture PNG en ${FIXTURES_DIR}`);
  process.exit(process.exitCode);
}

for (const [index, fixture] of fixtures.entries()) {
  const stamp = String(Date.now() + index);
  const target = join(watchDir, `Captura de pantalla ${stamp}.png`);

  await copyFile(join(FIXTURES_DIR, fixture), target);
  console.log(`✓ ${fixture} → ${target}`);

  if (index < fixtures.length - 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, PAUSE_MS);
    });
  }
}

console.log(`${fixtures.length} capturas sembradas en ${watchDir}`);
