/**
 * Comprueba el export estático: sirve `out/` y carga las cuatro rutas en un
 * navegador real, sin Tauri. Verifica que cada ventana monta su ancla y que no
 * se hace ni una petición fuera del origen.
 */
import assert from "node:assert/strict";
import { createReadStream, existsSync, statSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

import { chromium } from "@playwright/test";

import { REPO_ROOT, SHOTS_DIR, WINDOW_NAMES, ensureDirectory } from "./cdp.mjs";

const OUT_DIR = join(REPO_ROOT, "out");
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  const candidates = [pathname, `${pathname}/index.html`, `${pathname}.html`];

  for (const candidate of candidates) {
    const file = normalize(join(OUT_DIR, candidate));

    if (!file.startsWith(OUT_DIR)) {
      return null;
    }

    try {
      if (statSync(file).isFile()) {
        return file;
      }
    } catch {
      continue;
    }
  }

  return null;
}

const server = createServer(async (request, response) => {
  const file = resolveRequestPath(request.url ?? "/");

  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("no encontrado");
    return;
  }

  const metadata = await stat(file);
  response.writeHead(200, {
    "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
    "content-length": metadata.size,
  });
  createReadStream(file).pipe(response);
});

if (!existsSync(OUT_DIR)) {
  console.error("✗ falta out/. Ejecuta `pnpm build:web` antes de verificar el export.");
  process.exit(1);
}

await ensureDirectory(SHOTS_DIR);

await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
assert.ok(address && typeof address === "object", "el servidor estático debe exponer un puerto");
const origin = `http://127.0.0.1:${address.port}`;

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

const foreignRequests = [];
page.on("request", (request) => {
  if (!request.url().startsWith(origin) && !request.url().startsWith("data:")) {
    foreignRequests.push(request.url());
  }
});

const failures = [];

for (const name of WINDOW_NAMES) {
  const url = `${origin}/${name}/`;

  try {
    const response = await page.goto(url, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, `${url} debe responder 200`);

    const anchor = page.locator(`[data-window="${name}"]`);
    await anchor.waitFor({ state: "visible", timeout: 5000 });
    assert.equal(
      await anchor.getAttribute("data-testid"),
      `${name}-root`,
      "el ancla de la ventana debe conservar su data-testid",
    );

    const shot = join(SHOTS_DIR, `${name}-export.png`);
    await page.screenshot({ path: shot });
    console.log(`✓ /${name}/ carga y monta ${name}-root → ${shot}`);
  } catch (error) {
    failures.push(`/${name}/: ${error.message}`);
  }
}

assert.deepEqual(foreignRequests, [], `el export no debe pedir nada fuera de su origen`);

await browser.close();
await new Promise((resolve) => {
  server.close(resolve);
});

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`✗ ${failure}`);
  }
  process.exit(1);
}

console.log("✓ las cuatro rutas del export estático cargan sin peticiones externas");
