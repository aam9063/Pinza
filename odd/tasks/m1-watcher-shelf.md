# M1a — Vigilante y shelf

> Primera de las tres entregas de M1 (`BRIEF.md` §7). Solo Rust y la capa IPC: observa la carpeta
> de capturas y mantiene la lista de capturas colgadas. Las miniaturas, la ventana `line` y el
> despliegue por borde o atajo llegan en M1b y M1c.
> Idioma: documentación en castellano de España, código en inglés (`L3` del documento de M0).

## Specs

**S1 — Qué hace el vigilante (BRIEF §3, flujo 1).**
> El vigilante de archivos detecta el PNG nuevo en la carpeta de capturas.

**S2 — Cómo vigila (BRIEF §4, tabla de crates).**
> Vigilar la carpeta | crate `notify` (con debounce; esperar a que el PNG termine de escribirse)

**S3 — Quién manda (BRIEF §5.3).**
> **Rust es la fuente de verdad**: lista de capturas colgadas, ajustes, vigilante, atajo, detección de pantalla completa, posición del cursor, operaciones de archivo (copiar, papelera, guardar anotada), generación de miniaturas.
> **La web solo pinta y emite intenciones**: escucha eventos (`screenshot:added`, `screenshot:removed`, `line:show`, `line:hide`, `settings:changed`) y llama comandos tipados.

**S4 — El tope de la lista no borra nada (BRIEF §3, flujo 3).**
> Con más de N miniaturas (10 por defecto) la más antigua se descuelga de la línea; **el archivo nunca se borra por esto**.

**S5 — Operaciones de fichero y pruebas (AGENTS §5.1 y §2).**
> Pinza never makes network requests and never deletes user files permanently unless the user turned off "Move to Recycle Bin". File operations live only in `src-tauri/src/commands/` and are tested against temp folders
> **Never** point tests at the user's real Screenshots folder

**S6 — Módulos (BRIEF §5.4).** `src-tauri/src/watcher/` y `src-tauri/src/shelf/`, un módulo por concepto.

**S7 — Contrato con la web (feature map, entrada "Screenshot watcher").** Evento `screenshot:added`; comandos `pause_watching`, `resume_watching`. En esta entrega se añade `get_shelf` y el evento `screenshot:removed`.

**S8 — Tipado.** Toda llamada desde la web pasa por `src/shared/ipc/`; ningún otro módulo importa `@tauri-apps/*` (lo vigilan ESLint y dependency-cruiser).

## Fuera de alcance

- Miniaturas (`thumbnails/`) y cualquier pintado de la línea: M1b.
- Despliegue por borde, atajo global y detección de pantalla completa: M1c.
- Ajustes persistentes de la carpeta vigilada: M4. Aquí la carpeta llega por `PINZA_WATCH_DIR` y, si no está, por la carpeta conocida de capturas de Windows.
- Borrar, copiar o mover ficheros: no se tocan.

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | `shelf`: `ShelfEntry`, `Shelf` con tope configurable (10), alta, baja y consulta; descuelgue de la más antigua sin tocar el fichero; tests de unidad | S3, S4 |
| T2 | `watcher`: `notify` con debounce y espera a que el PNG esté completo; emite altas y bajas; comportamiento en tests con carpeta temporal | S1, S2, S5 |
| T3 | Carpeta vigilada: `PINZA_WATCH_DIR` y, si falta, la carpeta conocida de capturas de Windows desde `platform/windows` (único sitio con `unsafe`) | S2, S6 |
| T4 | Comandos y contrato: `get_shelf`, `pause_watching`, `resume_watching`, eventos `screenshot:added` y `screenshot:removed`, envoltorios tipados y test de Vitest de la capa IPC | S3, S7, S8 |

## Log

**L1:** «ok procede» → luz verde a arrancar M1 con el troceado propuesto: (1) vigilante y shelf, (2) miniaturas y cola de la línea, (3) despliegue por borde y atajo.
