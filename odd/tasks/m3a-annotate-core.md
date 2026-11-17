# M3a — Anotar (core): ventana, lienzo, lápiz, selección e historial

> Primera entrega del editor de anotaciones (M3, `BRIEF.md` §3 flujo 4). La ventana `editor`
> abre la captura a tamaño ajustado, permite dibujar con lápiz libre (perfect-freehand),
> seleccionar y mover anotaciones, deshacer/rehacer, y elegir entre 4 colores y 3 grosores.
> Copiar, Guardar y cerrar, resto de herramientas y export a resolución original: M3b/M3c.
> Idioma: documentación en castellano de España, código en inglés (`L3` del documento de M0).

## Specs

**S1 — La ventana (BRIEF §3, flujo 4, paso 1).**
> Se abre una ventana normal (con marco) con la captura a tamaño ajustado.

**S2 — Vectorial y lápiz (BRIEF §3, flujo 4, paso 2; §4 crates).**
> Herramientas vectoriales sobre la imagen; Deshacer con Ctrl+Z.
> Trazos del editor | **perfect-freehand** | Lápiz y resaltador con trazo natural.
> Lienzo del editor | **Konva** + **react-konva** | Capas vectoriales, selección, exportar a PNG.

**S3 — Cada anotación es un objeto (BRIEF §3, flujo 4, tabla Edición).**
> Cada anotación es un objeto: seleccionar, mover, redimensionar, cambiar color y grosor después de dibujarla, borrar con Supr, duplicar con Ctrl+D.

**S4 — Estilo (BRIEF §3, flujo 4, tabla Estilo).**
> 4 colores rápidos + selector de color, 3 grosores + deslizador, tamaño de texto.

**S5 — Historial (BRIEF §3, flujo 4, tabla Historial).**
> Deshacer (Ctrl+Z) y rehacer (Ctrl+Y / Ctrl+Mayús+Z) ilimitados durante la sesión.

**S6 — Atajos de herramienta (BRIEF §3, flujo 4, tabla Atajos).**
> Una letra por herramienta (V, P, H, A, L, R, E, T, N, B, C) mostrada en el tooltip.

**S7 — RPC y reglas del repo (AGENTS §5.1/§5.2, BRIEF §5.3).**
> El editor va en `src/features/annotate/`; la web no toca el fichero: leer la captura por el
> protocolo de assets y guardar la anotada es de Rust. Cada herramienta con su `data-testid`.

## Fuera de alcance (M3b/M3c)

- Resto de herramientas: resaltador, flecha, línea, rectángulo, elipse, texto, numeración, pixelar, recortar.
- Salida: Copiar, Guardar y cerrar (`_anotada.png` colgada en la línea), confirmación al cerrar con cambios, export a resolución original.
- Vista: zoom y desplazamiento.
- Redimensionar y cambiar color/grosor tras dibujar: M3b junto al resto de edición.

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | El editor sabe qué captura abrir: `open_window("editor")` con objetivo guardado en el shell y comando `get_editor_capture`; la imagen carga por el protocolo de assets | S1, S7 |
| T2 | Lienzo Konva a tamaño ajustado con la captura, herramienta lápiz con perfect-freehand, selección y mover de trazos | S1, S2, S3 |
| T3 | Historial ilimitado undo/redo (Ctrl+Z, Ctrl+Y / Ctrl+Mayús+Z) y borrar con Supr | S3, S5 |
| T4 | Barra de estilo: 4 colores rápidos, selector de color, 3 grosores y deslizador; atajo V/P en tooltips; `data-testid`s | S4, S6, S7 |
| T5 | Verificación en app real: abrir desde el mantener, dibujar, mover, deshacer, rehacer, borrar; captura de la ventana | S1-S6 |

## Log

**L1:** «mergeado!» → M2 merged (PR #5, `eb03469`); luz verde a M3 con el troceado annotate-core / tools / export. Rama `feature/m3a-annotate-core` desde `origin/dev`.
