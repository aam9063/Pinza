# M0 — Andamiaje

> Hito M0 de `BRIEF.md` §7: dejar el repo capaz de compilar, exportar las 4 rutas y verificarse.
> Idioma: documentación en castellano de España, código en inglés (ver `L3`). Specs citadas literalmente de `BRIEF.md` / `AGENTS.md`.

## Specs

**S1 — Contenido del hito (BRIEF §7, M0).**

> **M0 Andamiaje** | Tauri 2 + Next.js export estático + Tailwind + pnpm; ESLint, typecheck, Vitest, dependency-cruiser, clippy; las 4 rutas cargan en build; habilidad de verificación por CDP funcionando; CI en GitHub Actions `windows-latest`.

**S2 — Criterio de cierre (BRIEF §7, M0).**

> `pnpm verify` en verde en local y en CI; captura de cada ventana abierta.

**S3 — Export estático (BRIEF §5.1).**

> `next.config.ts`: `output: 'export'`, `images: { unoptimized: true }`.
> Prohibido: Server Actions (`"use server"`), Route Handlers, middleware, `next/headers`, `cookies()`, ISR, `next/image` con loader por defecto. Todo componente que use APIs de Tauri es `"use client"`.

**S4 — Rutas y ventanas (BRIEF §5.2).**

> `line` | `/line` | Sin marco, transparente, siempre encima, fuera de la barra de tareas, ancho completo del monitor principal, sin sombra.
> `editor` | `/editor` | Ventana normal, se crea al anotar y se destruye al cerrar.
> `settings` | `/settings` | Ventana normal, única.
> `onboarding` | `/onboarding` | Solo en el primer arranque.
> Cada ventana de Tauri carga **una ruta** del export estático. Verificar en el primer hito que las cuatro rutas cargan en el build de producción (no solo en `next dev`).

**S5 — Capa IPC única (BRIEF §5.3).**

> Toda llamada a Tauri desde la web pasa por **una única capa IPC tipada** (`src/shared/ipc/`). Ningún componente importa `@tauri-apps/api` directamente.

**S6 — Restricciones duras que M0 debe dejar puestas (AGENTS §5.1).**

> `src/features/*` may only import from itself and `src/shared/*`. Only `src/shared/ipc/` may import `@tauri-apps/api` or any `@tauri-apps/plugin-*` / `@crabnebula/*` package.
> Banned APIs / patterns: Next.js server features (`"use server"`, Route Handlers, `middleware.ts`, `next/headers`, `next/server`, `cookies()`); importing `framer-motion` (use `motion/react`); `console.log` (use the logger in `src/shared/`); in Rust, `unwrap()` / `expect()` outside tests (`clippy::unwrap_used`, `clippy::expect_used`) and `unsafe` outside `src-tauri/src/platform/windows/` (`#![deny(unsafe_code)]` at the crate root)
> The web app must stay statically exportable (`output: 'export'`): `next build` must succeed and produce the `line`, `editor`, `settings` and `onboarding` routes

**S7 — Estructura del repo (BRIEF §5.4).** Directorios `src/app/{line,editor,settings,onboarding}`, `src/features/`, `src/shared/{ipc,motion,i18n,ui}`, `src-tauri/src/{commands,watcher,shelf,thumbnails,settings,tray,windows_mgr,platform/windows}`, `e2e/`. En M0 se crean los que tienen contenido real; los vacíos llegan con su hito.

**S8 — Tooling de verificación (AGENTS §2).** M0 debe entregar los comandos: `pnpm dev:debug`, `verify:shot`, `verify:desktop-shot`, `verify:logs`, `verify:trace`, `verify:heap`, `verify:network`, `verify:ipc`, `seed:screenshots`, `verify:native`. Hasta que un comando exista hay que decir qué comprobación no se pudo correr y por qué.

**S9 — Comprobaciones estáticas (AGENTS §1, paso 5).**

> Run static checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm arch` (or all four at once with `pnpm verify`).

**S10 — CI.** GitHub Actions sobre `windows-latest` con las comprobaciones estáticas y el build del export estático (S1, S9).

**S11 — Idioma.** Documentación, README, PRs, issues y mensajes de commit en castellano de España; código (identificadores, tipos, nombres de fichero, comandos y eventos de Tauri) en inglés (`L3`).

## Tasks

| ID  | Tarea                                                                                                                        | Specs      | Ruta   | Commit    |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------- |
| T1  | Bootstrap del repo: `dev`, rama `feature/m0-scaffolding`, `.gitignore`, `.editorconfig`, `.gitattributes`                    | S7         | inline | `8b2e9ec` |
| T2  | Base web: Next 16.4 export estático, React 19, TS estricto, Tailwind 4 con tokens y las cuatro rutas                         | S1, S3, S4 | inline | `955c0cd` |
| T3  | Cimientos compartidos: presets de movimiento, `WindowShell`, capa IPC tipada con dos comandos                                | S5, S6, S7 | inline | `955c0cd` |
| T4  | Shell Tauri 2: `Cargo.toml`, `tauri.conf.json`, capabilities, las cuatro ventanas, `windows_mgr`, `app_info` y `open_window` | S1, S4, S6 | inline | `9a75c67` |
| T5  | Calidad estática: ESLint plano, Prettier, typecheck, dependency-cruiser con las fronteras de carpetas                        | S6, S9     | inline | `955c0cd` |
| T6  | Tests: Vitest + Testing Library, RED observado antes de cada verde                                                           | S1, S9     | inline | `955c0cd` |
| T7  | Tooling de verificación por CDP, `verify:export` y `pnpm verify` agregador                                                   | S2, S8, S9 | inline | `7eac8dc` |
| T8  | CI en `windows-latest`: job web y job de Rust                                                                                | S1, S10    | inline | `f63dd59` |
| T9  | README en castellano y mapa de features con M0 real                                                                          | S11, S8    | inline | `f63dd59` |
| T10 | Arrancar la app con `pnpm dev:debug` y capturar las cuatro ventanas reales                                                   | S2, S4     | worker | `a70ef20` |
| T11 | Arreglar el deadlock de `open_window`: comando síncrono bloqueando el hilo principal                                         | S4         | worker | `a70ef20` |

## Estado

M0 **cerrado en local**. Las dos patas que faltaban cuando se escribió la primera versión de este
documento ya están verificadas: el toolchain de Rust se instaló y la app real se ejecutó.

| Criterio de S2                                                | Estado                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm verify` (typecheck, lint, arch, test, build:web)        | 🟢 verde                                                               |
| `pnpm verify:export` (cuatro rutas, cero peticiones externas) | 🟢 verde                                                               |
| `cargo fmt --check`                                           | 🟢 sin diferencias                                                     |
| `cargo clippy --all-targets -- -D warnings`                   | 🟢 cero avisos (`unwrap_used`/`expect_used` denegados fuera de tests)  |
| `cargo test`                                                  | 🟢 3/3                                                                 |
| `pnpm e2e` contra la app viva                                 | 🟢 4/4: abre las cuatro ventanas con `open_window`                     |
| Captura de cada ventana abierta                               | 🟢 `line`, `editor`, `settings`, `onboarding` y el escritorio completo |
| CI en verde                                                   | 🔴 escrito y sin ejecutar: falta el push, que decide Albert (L7)       |

Queda una sola pata abierta de S2, y no es código: el workflow nunca se ha ejecutado porque la rama
no se ha publicado.

## Evidencias

- `pnpm verify`: typecheck, ESLint, dependency-cruiser (18 módulos), 12 tests de Vitest y `next build`
  con `/line`, `/editor`, `/settings` y `/onboarding` como páginas estáticas.
- `pnpm verify:export`: las cuatro rutas cargan su ancla y no se hace ninguna petición fuera del origen.
- Guardas probadas creando ficheros que las violan y borrándolos: `@tauri-apps/*` fuera de
  `src/shared/ipc/` (ESLint y dependency-cruiser), `features-are-isolated`, `framer-motion`,
  `"use server"`, `console.log` y `any`; y la contra-prueba en `src/shared/ipc/`, que pasa.
- App real: `pnpm dev:debug` arranca en ~12 s con CDP en el 9222. `verify:ipc` verde con las cuatro
  ventanas abiertas, `verify:network` verde (ninguna petición fuera del `devUrl` ni del protocolo de
  assets) y capturas en `.verify/shots`: `line.png` 1920×160, `editor.png` 1080×720,
  `settings.png` 720×640, `onboarding.png` 720×560, `desktop.png` 3840×1080.

**Defecto encontrado y arreglado durante M0 (T11).** `open_window` era síncrono y Tauri ejecuta los
comandos síncronos en el hilo principal: `WebviewWindowBuilder::build` bloqueaba ese hilo y la
invocación se quedaba esperando a un hilo bloqueado por ella misma. Síntomas observados: la ventana
nunca se creaba, ningún target nuevo en CDP y toda la IPC muerta después (el `app_info` posterior
también expiraba) mientras el renderer seguía respondiendo en 2 ms. RED: `pnpm e2e` 1 verde y 3 rojos.
GREEN tras pasar el comando a `async`: 4/4. Guard: el E2E, porque un test de Rust no puede observar un
deadlock del bucle de eventos.

## Log

**L1 (petición original, literal):**

> Lee BRIEF.md y AGENTS.md y aunque el agents.md esté en inglés el proyecto se va a hacer en castellano de españa (no rioplatense) respecto a todo lo que sea documentación de readme etc. El código si que vas a hacerlo en inglés (variables etc). Cíñete a esos documentos para no salirte de lo planeado

**L2:** «ok procede con todo» → autoriza arrancar M0 como feature de ODD y redactar el README en castellano.

**L3 (decisión de idioma):** «Todo lo escrito en castellano salvo el código»: README, `docs/`, `odd/tasks/`, descripciones de PR e issues y mensajes de commit en castellano de España; identificadores, tipos, nombres de fichero y tokens técnicos en inglés. `AGENTS.md` y `BRIEF.md` se quedan en inglés tal cual.

**L4 (entorno, 17 nov):** Node v24.22.1, pnpm 11.4.0, git 2.49. **No hay `cargo`/`rustc`/`rustup` en la máquina**: `cargo test`, `cargo clippy`, `tauri build` y las capturas de ventana reales no se pueden ejecutar aquí. WebView2 157.0.4341.46 presente. Registro npm: `next@16.4.6`, `@tauri-apps/cli@2.12.5`, `tailwindcss@4.3.5`, `react@19.3.1`.

**L5 (decisión con evidencia): TypeScript 6, no 7.** El brief pide la última estable de cada librería, pero con `typescript@7.0.2` el proyecto no arranca sus propias comprobaciones:

```
typescript-eslint does not support TS 7.0.
dependency-cruiser detected a TypeScript environment, but not a compatible
TypeScript compiler (typescript: >=2.0.0 <7.0.0)
```

Se fija `typescript@6.0.3` y se subirá cuando `typescript-eslint` y dependency-cruiser soporten la 7. También se descartó `eslint-config-next` (peer de ESLint 9 frente al 10 instalado) y no hacía falta: las reglas de Next que importan son prohibiciones y están escritas a mano en `eslint.config.mjs`.

**L6 (evidencia):** RED observado antes de crear las rutas (`Failed to resolve import "./editor/page"` con 8 tests ya en verde) y después GREEN. `pnpm verify` y `pnpm verify:export` en verde sobre el árbol commiteado.

**L7 (falta decisión de Albert):** instalar el toolchain de Rust en esta máquina (o llevar el repo a una que lo tenga) para cerrar S2, y hacer push de `feature/m0-scaffolding` para que corra el CI. No se ha hecho push de nada.

**L8 (defecto y arreglo):** `open_window` bloqueaba el hilo principal (ver Evidencias). Arreglado en `a70ef20` con `pub async fn`; no hizo falta `run_on_main_thread`. El doc-comment del comando cita la documentación de Tauri sobre comandos async, que es la excepción que `AGENTS.md` §5.1 permite para comportamiento de plataforma no obvio.

**L9 (decisiones menores con motivo):**

- `next dev` añade un bloque `<!-- BEGIN:nextjs-agent-rules -->` a `AGENTS.md` en cada arranque. No hay ajuste para desactivarlo (solo `experimental.agentFeedback`, que es otra cosa), así que se commitea: si no, el árbol queda sucio siempre.
- `devIndicators: false` en `next.config.ts`: el indicador de desarrollo de Next salía en todas las capturas de verificación.
- El E2E reintenta una vez con recarga si el dev server de Next sirve un 500 al compilar tres ventanas a la vez (`EPERM` en `.next/dev`). Es un fallo del servidor de desarrollo, no de la app: no existe en el export estático. Queda amortiguado, no eliminado.
- `cargo clippy --all-targets -D warnings` no es sintaxis válida de cargo; la forma correcta (y la que usa el CI) es `cargo clippy --all-targets -- -D warnings`.
