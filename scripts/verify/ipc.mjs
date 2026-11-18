/**
 * Humo del contrato IPC: invoca cada comando tipado de `src/shared/ipc` desde
 * la ventana de la línea y valida la forma de la respuesta.
 *
 * Solo sirve con la app en marcha (`pnpm dev:debug`), porque los comandos los
 * sirve Rust.
 */
import { connectToPinza, fail, findWindowPage } from "./cdp.mjs";

const commands = [
  {
    command: "app_info",
    args: {},
    validate: (result) =>
      typeof result?.name === "string" &&
      typeof result?.version === "string" &&
      typeof result?.tauriVersion === "string",
    expectation: "{ name, version, tauriVersion } en texto",
  },
];

const browser = await connectToPinza();
const page = findWindowPage(browser, "line");

if (!page) {
  await browser.close();
  fail("la ventana line no está abierta; arranca la app con `pnpm dev:debug`");
  process.exit(process.exitCode);
}

const failures = [];

for (const { command, args, validate, expectation } of commands) {
  const result = await page.evaluate(
    async ({ command, args }) => {
      try {
        return { ok: true, value: await window.__TAURI_INTERNALS__.invoke(command, args) };
      } catch (error) {
        return { ok: false, value: String(error) };
      }
    },
    { command, args },
  );

  if (!result.ok) {
    failures.push(`${command} falló: ${result.value}`);
    continue;
  }

  if (!validate(result.value)) {
    failures.push(`${command} devolvió una forma inesperada; se esperaba ${expectation}`);
    continue;
  }

  console.log(`✓ ${command}`);
}

await browser.close();

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`✗ ${failure}`);
  }
  process.exit(1);
}

console.log(`✓ ${commands.length} comandos responden con la forma esperada`);
