# M1b — Miniaturas y cola de la línea

> Segunda de las tres entregas de M1 (`BRIEF.md` §7). Genera miniaturas en Rust y la ventana
> `line` cuelga y descuelga capturas con animación. El despliegue por borde o atajo llega en M1c.
> Idioma: documentación en castellano de España, código en inglés (`L3` del documento de M0).

## Specs

**S1 — Miniaturas en Rust, nunca el PNG completo (BRIEF §4, tabla de crates).**
> Miniaturas | crate `image` (generadas en Rust, nunca cargar el PNG completo en la línea)

**S2 — Cómo llegan a la web (BRIEF §5.3, línea 169).**
> Las miniaturas llegan a la web como rutas servidas por el protocolo de assets de Tauri, con el scope limitado a la carpeta de miniaturas.

**S3 — La ventana line (BRIEF §5.4, tabla de ventanas).**
> `line` | `/line` | Sin marco, transparente, siempre encima, fuera de la barra de tareas, ancho completo del monitor principal, sin sombra. Ignora el ratón salvo encima de las miniaturas (alternar `set_ignore_cursor_events` según la zona).

**S4 — El colgar (BRIEF §3, flujo 2).**
> La línea baja con animación de muelle, la miniatura nueva cae y se cuelga a la izquierda con un pequeño balanceo, y aparece la etiqueta "Nueva".

**S5 — Aspecto colgada (BRIEF §2, pantalla 01 y §3).**
> Las miniaturas parecen fotos colgadas: fondo blanco, borde fino, sombra, rotación aleatoria entre -2° y 2°, pinza de madera (`#C99A5B`).
> Con más de N miniaturas (10 por defecto) la más antigua se descuelga de la línea; **el archivo nunca se borra por esto**.

**S6 — El descuelgue (BRIEF §3, flujo 3).**
> Unhang: la pinza se abre y la miniatura cae.

**S7 — Presupuestos de rendimiento (BRIEF §6).**
> De captura guardada a miniatura visible: < 300 ms.
> Memoria de la app completa en reposo con 10 miniaturas: objetivo < 150 MB.

**S8 — Presets y arquitectura (AGENTS §5.2 y §5.1).**
> Animaciones: reutilizar `springDrop`, `springSway`, `slideDown`, `unhang`, `lift` de `src/shared/motion/`. Animar solo `transform` y `opacity`. Cada elemento interactivo lleva `data-testid`.
> La web feature va en `src/features/line/`; la web no toca el sistema de ficheros; Rust es la fuente de verdad de la lista.

## Fuera de alcance

- Despliegue por borde, atajo global y detección de pantalla completa: M1c.
- Gestos (copiar, anotar, abrir, papelera, arrastrar): M2. Aquí solo el descuelgue por tope y por clic en la pinza si hace falta para probar.
- Ajustes persistentes: M4.

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | `thumbnails/` en Rust: genera PNG reducido de 160 px con crate `image`, caché en carpeta de datos, probado con carpeta temporal | S1 |
| T2 | Servir miniaturas por el protocolo de assets con scope limitado a la carpeta de miniaturas | S2 |
| T3 | Cola de la línea: al colgar con tope 10, la más antigua se descuelga (`screenshot:removed`); el fichero nunca se borra | S5 |
| T4 | Ventana `line` real: transparente, siempre encima, fuera de la barra de tareas, ancho completo; `set_ignore_cursor_events` según zona | S3 |
| T5 | UI de la línea: cuerda, miniaturas colgadas, pinza, etiqueta «Nueva», animaciones con presets, `data-testid`s | S4-S6-S8 |
| T6 | E2E de rendimiento: captura→miniatura visible < 300 ms con `pnpm dev:debug` + CDP; presupuesto de memoria en reposo | S7 |

## Log

**L1:** «ya he pusheado m1» → M1a mergeado en `dev` por Albert; luz verde para M1b según el troceado acordado en L1 de m1-watcher-shelf.md.

**L2:** T1-T6 implementadas y verificadas contra la app real (`pnpm dev:debug` + CDP + logs de Rust). Evidencia: captura→miniatura visible 225 ms (< 300 ms, S7); tope 10 con 2 eventos `screenshot:removed` y ficheros intactos (S5-S6); memoria 32,5 MB con 10 miniaturas (< 150 MB, S7); click-through por zona con `set_line_interactive` (S3). Hallazgo corregido en el camino: un span decorativo con 4 keyframes y spring rompía el hidratado de toda la página (Motion solo admite 2 frames con spring); eliminado. Commits: T1 (thumbnails), T2 (protocolo assets), T3 (54f9a12), T4-T5 (94157a9), T6 (f7e0903). Pendiente: PR contra `dev`.
