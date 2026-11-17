/**
 * E2E contra la app real: se conecta al WebView2 por CDP y abre cada ventana
 * con el comando `open_window` de la propia aplicación.
 *
 * Requiere `pnpm dev:debug` en marcha.
 */
import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

const DEBUG_URL = process.env.PINZA_CDP_URL ?? "http://127.0.0.1:9222";
const WINDOWS = ["line", "editor", "settings", "onboarding"] as const;

type WindowName = (typeof WINDOWS)[number];

let browser: Browser;

function pagesOf(target: Browser): Page[] {
  return target.contexts().flatMap((context) => context.pages());
}

function findWindow(name: WindowName): Page | undefined {
  return pagesOf(browser).find((page) => page.url().includes(`/${name}/`));
}

async function openWindow(name: WindowName): Promise<Page> {
  const existing = findWindow(name);

  if (existing) {
    return existing;
  }

  const line = findWindow("line");

  if (!line) {
    throw new Error("la ventana line debe estar abierta para poder abrir las demás");
  }

  await line.evaluate((label) => window.__TAURI_INTERNALS__.invoke("open_window", { label }), name);

  await expect.poll(() => findWindow(name)?.url() ?? null).not.toBeNull();

  const opened = findWindow(name);

  if (!opened) {
    throw new Error(`la ventana ${name} no apareció tras open_window`);
  }

  return opened;
}

test.beforeAll(async () => {
  browser = await chromium.connectOverCDP(DEBUG_URL);
});

test.afterAll(async () => {
  await browser?.close();
});

for (const name of WINDOWS) {
  test(`la ventana ${name} monta su ancla`, async () => {
    const page = name === "line" ? findWindow("line") : await openWindow(name);

    if (!page) {
      throw new Error(`la ventana ${name} no estaba abierta`);
    }

    await expect(page.getByTestId(`${name}-root`)).toBeVisible();
  });
}
