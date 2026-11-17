# M2 — Gestos sobre miniaturas

> Los gestos del flujo 3 del `BRIEF.md` sobre cada miniatura colgada: barra de acciones al
> pasar el ratón, copiar con clic, mantener para anotar, doble clic para abrir, arrastre nativo
> y papelera. El editor en sí es M3; aquí el mantener 0,4 s abre la ventana `editor` existente.
> Idioma: documentación en castellano de España, código en inglés (`L3` del documento de M0).

## Specs

**S1 — Hover (BRIEF §3, flujo 3).**
> Hover | Muestra la barra de acciones | La miniatura se endereza y sube 2 px

**S2 — Clic copia (BRIEF §3, flujo 3).**
> Clic | Copia la imagen al portapapeles | Pastilla "Copiada" 1,2 s

**S3 — Mantener abre el editor (BRIEF §3, flujo 3).**
> Mantener 0,4 s | Abre el editor de anotaciones | Anillo de progreso que se llena

**S4 — Doble clic abre (BRIEF §3, flujo 3).**
> Doble clic | Abre con el visor predeterminado de Windows | Ninguno extra

**S5 — Arrastre nativo (BRIEF §3, flujo 3).**
> Arrastrar | Arrastre nativo del archivo a Explorador, chat, correo o documento | La miniatura se despega con sombra elevada

**S6 — Papelera (BRIEF §3, flujo 3 y §1).**
> Papelera (botón o arrastre a la Papelera) | Envía el archivo a la Papelera de reciclaje | La pinza se abre y la miniatura cae
> Pinza nunca borra permanentemente salvo ajuste contrario (M4); «Unhanging never deletes the file» aplica al tope, no a la papelera pedida por el usuario.

**S7 — Operaciones de fichero en Rust y probadas (AGENTS §5.1/§5.2, BRIEF §5.3).**
> File operations live only in `src-tauri/src/commands/` and are tested against temp folders
> **Rust es la fuente de verdad**: operaciones de archivo (copiar, papelera, guardar anotada)
> Crates: `tauri-plugin-clipboard-manager`, `tauri-plugin-opener`, `tauri-plugin-drag`, `trash`.

**S8 — Selectores (feature map, entrada de gestos).**
> `thumb-action-copy`, `thumb-action-annotate`, `thumb-action-open`, `thumb-action-trash`, `thumb-hold-ring` (previstos); cada elemento interactivo lleva `data-testid`.

**S9 — Animación con presets (AGENTS §5.2).**
> Animar solo `transform` y `opacity`; reutilizar `lift` y `unhang` de `src/shared/motion/`.

## Fuera de alcance

- El editor de anotaciones (herramientas, export `_anotada.png`): M3.
- Arrastrar a la Papelera como gesto propio: el botón de papelera cubre S6 en esta entrega.
- Ajustes persistentes (papelera vs. borrado definitivo): M4.

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | Comandos Rust `copy_image`, `open_file`, `trash_file` con plugins de portapapeles y opener y crate `trash`; pruebas contra carpeta temporal | S2, S4, S6, S7 |
| T2 | Comando `start_drag` con `tauri-plugin-drag` para el arrastre nativo del fichero | S5, S7 |
| T3 | IPC tipado: contract, wrappers y test de Vitest de los comandos nuevos | S7, S8 |
| T4 | UI de gestos en `HangingThumbnail`: barra de acciones en hover, anillo de 0,4 s, pastilla «Copiada», arrastre, papelera; presets y `data-testid`s | S1-S9 |
| T5 | Verificación en app real de cada gesto (copia real al portapapeles, papelera real con fichero temporal, doble clic, arrastre iniciado) | S1-S6 |

## Log

**L1:** «ok continua» → M1 mergeado (PRs #3 y #4); luz verde a M2 con el alcance del flujo 3. Rama `feature/m2-gestures` desde `origin/dev` (`caf94d5`).

**L2:** T1-T5 implementadas. Verificación en app real: barra de acciones en hover real (4 botones con sus `data-testid`), se oculta al salir; pastilla «Copiada» 1,2 s al hacer clic; papelera real: el fichero sale de la carpeta vigilada a la Papelera de reciclaje (readdir antes/después); copiar y abrir van por los plugins de portapapeles y opener con validación de fichero; el arrastre nativo va por el comando del plugin desde la capa IPC (su API Rust no es pública). **Rediseño del click-through**: mientras la ventana ignora el ratón la web no recibe eventos de puntero, así que la activación por `pointermove` de la web era inalcanzable; ahora la web publica los rectángulos físicos de las miniaturas (`set_thumbnail_rects`, solo con la línea visible: oculta, el contenedor está en translateY(-100%)) y el bucle de sondeo de Rust alterna `set_ignore_cursor_events` solo al cruzar el borde de una miniatura. El doble clic con el visor de Windows y el arrastre hasta otra app requieren interacción de escritorio real no automatizable en este entorno; su cableado queda verificado (comandos probados en Rust con carpeta temporal + API del plugin). Checks: `cargo test` 40/40, clippy limpio, `pnpm test` 24/24, typecheck/lint/arch verdes. Commits: afeb747 (T1), a0dcc6c (T3), fb8f499 (T4), click-through por rects. Pendiente: push, revisión RDD y PR.
