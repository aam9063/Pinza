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

| ID | Tarea | Specs | Ruta | Commit |
|---|---|---|---|---|
| T1 | Bootstrap del repo: `dev` desde el árbol actual, rama `feature/m0-scaffolding` desde `dev`, `.gitignore`, `.editorconfig`, `pnpm-workspace` innecesario | S7 | inline | `chore(repo): bootstrap dev and feature branch` |
| T2 | Base web: pnpm + Next 16.4 export estático + React 19 + TS estricto + Tailwind v4 con tokens en `@theme`; 4 rutas carga-bles | S1, S3, S4 | inline | `feat(app): scaffold static export with the four window routes` |
| T3 | Cimientos compartidos: `src/shared/motion/` (presets + `MotionConfig`), `src/shared/ui/`, `src/shared/ipc/` con un comando ejemplar tipado | S5, S6, S7 | inline | `feat(shared): add motion presets, ui shell and typed ipc layer` |
| T4 | Shell Tauri 2: `Cargo.toml`, `tauri.conf.json`, capabilities, ventanas de `line`/`editor`/`settings`/`onboarding`, `windows_mgr`, comando `app_info`, `#![deny(unsafe_code)]` | S1, S4, S6 | inline | `feat(tauri): scaffold shell with the four windows` |
| T5 | Calidad estática: ESLint flat + Prettier + typecheck + dependency-cruiser (`pnpm arch`) con las reglas de S6 | S6, S9 | inline | `chore(quality): enforce architecture and static checks` |
| T6 | Tests: Vitest + Testing Library con RED observado por ruta y por preset | S1, S9 | inline | `test(app): cover the four routes and the ipc layer` |
| T7 | Tooling de verificación por CDP + `cargo test`/clippy wiring + `pnpm verify` agregador | S2, S8, S9 | inline | `feat(verify): add cdp verification tooling` |
| T8 | CI en `windows-latest` | S1, S10 | inline | `ci(github): run static checks and export build on windows` |
| T9 | README en castellano + `docs/feature-map.md` con las rutas reales de M0 | S11, S8 | inline | `docs(readme): describe pinza scope and m0 verification` |

## Log

**L1 (petición original, literal):**
> Lee BRIEF.md y AGENTS.md y aunque el agents.md esté en inglés el proyecto se va a hacer en castellano de españa (no rioplatense) respecto a todo lo que sea documentación de readme etc. El código si que vas a hacerlo en inglés (variables etc). Cíñete a esos documentos para no salirte de lo planeado

**L2:** «ok procede con todo» → autoriza arrancar M0 como feature de ODD y redactar el README en castellano.

**L3 (decisión de idioma):** «Todo lo escrito en castellano salvo el código»: README, `docs/`, `odd/tasks/`, descripciones de PR e issues y mensajes de commit en castellano de España; identificadores, tipos, nombres de fichero y tokens técnicos en inglés. `AGENTS.md` y `BRIEF.md` se quedan en inglés tal cual.

**L4 (entorno, 17 nov):** Node v24.22.1, pnpm 11.4.0, git 2.49. **No hay `cargo`/`rustc`/`rustup` en la máquina**: `cargo test`, `cargo clippy`, `tauri build` y las capturas de ventana reales no se pueden ejecutar aquí. WebView2 157.0.4341.46 presente. Registro npm: `next@16.4.6`, `@tauri-apps/cli@2.12.5`, `tailwindcss@4.3.5`, `react@19.3.1`.
