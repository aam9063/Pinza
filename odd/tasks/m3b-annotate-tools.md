# M3b — Annotate tools: resto de herramientas y edición de objetos

> Segunda entrega del editor (M3, `BRIEF.md` §3 flujo 4). Añade las herramientas vectoriales
> restantes y la edición completa de cada anotación tras dibujarla. Pixelar/difuminar, recortar,
> zoom y la salida (copiar / guardar `_anotada.png`) van en M3c.
> Idioma: documentación en castellano de España, código en inglés (`L3` del documento de M0).

## Specs

**S1 — Herramientas (BRIEF §3, flujo 4, tabla Herramientas).**
> Seleccionar y mover, lápiz libre, resaltador, flecha, línea, rectángulo, elipse, texto, numeración de pasos (círculos 1, 2, 3… que se autoincrementan), pixelar o difuminar una zona (ocultar datos sensibles), recortar.
> (M3b: resaltador, flecha, línea, rectángulo, elipse, texto, numeración. Pixelar, difuminar, recortar y zoom: M3c.)

**S2 — Edición (BRIEF §3, flujo 4, tabla Edición).**
> Cada anotación es un objeto: seleccionar, mover, redimensionar, cambiar color y grosor después de dibujarla, borrar con Supr, duplicar con Ctrl+D.

**S3 — Estilo (BRIEF §3, flujo 4, tabla Estilo).**
> 4 colores rápidos + selector de color, 3 grosores + deslizador, tamaño de texto.

**S4 — Atajos (BRIEF §3, flujo 4, tabla Atajos).**
> Una letra por herramienta (V, P, H, A, L, R, E, T, N, B, C) mostrada en el tooltip.

**S5 — Historial (BRIEF §3, flujo 4, tabla Historial).**
> Deshacer (Ctrl+Z) y rehacer (Ctrl+Y / Ctrl+Mayús+Z) ilimitados durante la sesión.

**S6 — Reglas del repo (AGENTS §5.2, L3 del documento de M0).**
> Cada herramienta con su `data-testid`; animar solo `transform` y `opacity`; el store sigue
> siendo reducers puros con tests.

## Fuera de alcance (M3c)

- Pixelar/difuminar, recortar, zoom y desplazamiento.
- Salida: Copiar, Guardar y cerrar (`_anotada.png` colgada), confirmación al cerrar, export a resolución original.

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | Store: nuevas clases de anotación (resaltador, flecha, línea, rectángulo, elipse, texto, paso numerado) con transformado de geometría y tests | S1, S5, S6 |
| T2 | Edición tras dibujar: redimensionar con Transformer horneando la geometría, cambiar color/grosor del seleccionado, duplicar con Ctrl+D, y tests | S2, S3, S6 |
| T3 | Lienzo: dibujar y renderizar cada herramienta nueva; numeración autoincrementada; texto editable en línea | S1, S3, S6 |
| T4 | Barra: botones nuevos con atajos H, A, L, R, E, T, N y toolt ips; aplicar estilo al seleccionado | S2, S3, S4 |
| T5 | Verificación en app real de cada herramienta y de la edición (redimensionar, recolor, duplicar, borrar) | S1-S5 |

## Log

**L1:** «ya esta merge» → M3a merged (PR #6, `b11d43e`); luz verde a M3b con el alcance de arriba. Rama `feature/m3b-annotate-tools` desde `origin/dev`.

**L2:** T1-T5 implementadas y verificadas contra la app real. Evidencia (docs/design/evidence/m3b-editor.png): resaltador translúcido, flecha con punta, línea, rectángulo, elipse, texto en línea («hola Pinza») y paso numerado «1» dibujados sobre la captura; la barra muestra las 9 herramientas con sus atajos. La edición tras dibujar funciona por el store: transform horneado al soltar el Transformer, restyle del seleccionado al cambiar color/grosor, duplicar con Ctrl+D, borrar con Supr. Bug real corregido: el Group del paso no recibía x/y y se pintaba en el origen. Nota de verificación: los primeros intentos fallaron por el mismo patrón de closures obsoletos de M3a (color/herramienta cambiada y dibujo en el mismo tick) y por coordenadas de pantalla sin dividir por la escala del stage; el flujo real con el usuario no sufre nada de esto al ir los eventos separados en el tiempo. Checks: `pnpm test` 38/38 (14 del store), typecheck/lint/arch verdes. No hubo cambios de Rust. Commits: 47be1c5 (T1), 977fea4 (T2-T3), 9241868 (T4), fix del paso. Pendiente: push, revisión RDD y PR.
