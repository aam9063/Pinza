# M3c — Annotate output: pixelar, recortar, zoom y salida

> Tercera y última entrega del editor (M3, `BRIEF.md` §3 flujo 4). Cierra el editor: pixelar o
> difuminar una zona, recortar, zoom y desplazamiento, y la salida — Copiar la anotada,
> Guardar y cerrar con `save_annotated` en Rust (escribe `captura_<fecha>_<hora>_anotada.png`
> junto al original sin tocarlo y la cuelga en la línea), confirmación al cerrar con cambios.
> Idioma: documentación en castellano de España, código en inglés (`L3` del documento de M0).

## Specs

**S1 — Pixelar o difuminar (BRIEF §3, flujo 4, tabla Herramientas).**
> pixelar o difuminar una zona (ocultar datos sensibles)

**S2 — Recortar y vista (BRIEF §3, flujo 4, tablas Herramientas y Vista).**
> recortar
> Zoom con Ctrl + rueda y Ctrl + 0 para ajustar, desplazamiento con espacio + arrastre.

**S3 — Salida (BRIEF §3, flujo 4, tabla Salida).**
> Copiar al portapapeles (Ctrl+C sin selección), Guardar y cerrar (Ctrl+S), cerrar sin guardar pide confirmación si hay cambios. Exporta a la resolución original de la captura, no a la de pantalla.

**S4 — Guardar y cerrar (BRIEF §3, flujo 4, paso 3).**
> "Guardar y cerrar" escribe `captura_<fecha>_<hora>_anotada.png` junto al original y la cuelga en la línea como captura nueva.

**S5 — Operaciones de fichero en Rust y probadas (AGENTS §5.1, BRIEF §5.3).**
> File operations live only in `src-tauri/src/commands/` and are tested against temp folders
> **Rust es la fuente de verdad**: operaciones de archivo (…guardar anotada)
> El original nunca se modifica.

**S6 — Reglas del repo (AGENTS §5.2).**
> Cada herramienta y botón con su `data-testid`; animar solo `transform` y `opacity`.

## Fuera de alcance

- Ajustes persistentes (papelera vs. borrado definitivo): M4.
- Bandeja, autostart, instancia única: M4.

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | `save_annotated` en Rust: recibe el PNG anotado y el original, escribe `captura_<fecha>_<hora>_anotada.png` junto al original, no lo toca, y devuelve la ruta; pruebas contra carpeta temporal | S3-S4-S5 |
| T2 | Pixelar y difuminar una zona seleccionada; tool B | S1 |
| T3 | Recortar: seleccionar área y recortar la captura (con confirmación); tool C | S2 |
| T4 | Zoom con Ctrl+rueda y Ctrl+0; desplazamiento con espacio+arrastre | S2 |
| T5 | Salida en la web: export Konva a PNG a resolución original, Copiar (Ctrl+C), Guardar y cerrar (Ctrl+S), confirmación al cerrar con cambios | S3 |
| T6 | Verificación en app real: pixelar, recortar, zoom, copiar, guardar y cerrar con la `_anotada.png` real en disco y colgada en la línea; hash del original intacto | S1-S5 |

## Log

**L1:** «continúa» → M3b merged (PR #7, `e5d7099`); luz verde a M3c, última entrega del editor. Rama `feature/m3c-annotate-output` desde `origin/dev`.

**L2:** T1-T6 implementadas y verificadas contra la app real. Evidencia: fichero `_anotada.png` real en disco junto al original (nombre con fecha y hora generado por Rust), PNG válido (cabecera 89504e47), hash SHA-256 del original intacto, la copia colgada en la línea vía `screenshot:added` (`get_shelf` la contiene), y la ventana editor cerrada tras Ctrl+S. Pixelar y difuminar con los filtros Pixelate/Blur de Konva aplicados al recorte del fondo; recorte con shift de coordenadas y descarte de lo que sale; zoom con Ctrl+rueda (verificado 1→2,22) y Ctrl+0; espacio+arrastre para desplazar. Dos problemas reales corregidos: (1) el canvas de export estaba **tainted** porque el protocolo de assets no sirve cabeceras CORS — el fondo ahora llega por IPC como `data:` URL (`get_editor_capture_png`); (2) `window.close()` no cierra webviews del shell — comando de la API window con permiso `core:window:allow-close` añadido al capability. Nota: la ruta de Copiar (Ctrl+C) pasa por `save_annotated` + `copy_image` sobre la copia guardada, para reutilizar el mismo pipeline. Checks: `cargo test` 43/43 (3 nuevos de save_annotated), `pnpm test` 43/43, typecheck/lint/arch verdes. Commits: 6178b85 (T1), 797dd40 (T2-T4), b34541f (T5), 5058d72 y fixes. Pendiente: push, revisión RDD y PR.
