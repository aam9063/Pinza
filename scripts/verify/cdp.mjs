import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = join(here, "..", "..");
export const SHOTS_DIR = join(REPO_ROOT, ".verify", "shots");
export const TRACES_DIR = join(REPO_ROOT, ".verify", "traces");
export const HEAPS_DIR = join(REPO_ROOT, ".verify", "heap");

export const DEBUG_URL = process.env.PINZA_CDP_URL ?? "http://127.0.0.1:9222";
export const WINDOW_NAMES = ["line", "editor", "settings", "onboarding"];

/** Conecta al WebView2 de la app que corre con `pnpm dev:debug`. */
export function connectToPinza() {
  return chromium.connectOverCDP(DEBUG_URL);
}

/** Busca la página de una ventana por la ruta que carga. */
export function findWindowPage(browser, name) {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      const url = page.url();
      if (url.endsWith(`/${name}/`) || url.endsWith(`/${name}`)) {
        return page;
      }
    }
  }

  return null;
}

export async function ensureDirectory(path) {
  await mkdir(path, { recursive: true });
  return path;
}

export async function findOpenWindowEntities(browser) {
  const open = [];
  for (const name of WINDOW_NAMES) {
    const page = findWindowPage(browser, name);
    if (page) {
      open.push({ name, page });
    }
  }

  return open;
}

export function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}
