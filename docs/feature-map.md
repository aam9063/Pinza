# Feature Map: Pinza

> Sembrado antes de que existiera código. Cada entrada marcada **(prevista)** se sustituye por rutas, selectores y comandos reales cuando llega su hito (ver `AGENTS.md` sección 3).
> Hitos y flujos: `BRIEF.md`. Pantallas de referencia: `docs/design/`.
> Las entradas de M0 son reales; el resto siguen siendo previstas.

## Shell, ventanas y andamiaje (M0, real)

- What it is (user point of view): Pinza abre una franja transparente en el borde superior y tres ventanas normales que se abren solo cuando se piden.
- Sub-features: ventana `line` siempre visible y estirada al ancho del monitor principal; `editor`, `settings` y `onboarding` creadas bajo demanda y destruidas al cerrarse; capa IPC tipada; export estático con las cuatro rutas.
- How to reach it in the UI: `pnpm dev:debug` abre la línea; las demás ventanas se abren con el comando `open_window` (menú de bandeja en M4, gestos en M2 y M3).
- Keyboard shortcuts: ninguno todavía (el atajo global llega con M1).
- Selectors for programmatic control: `line-root`, `editor-root`, `settings-root`, `onboarding-root` (todos con `data-window` igual al nombre de la ventana).
- Code location: `src/app/{line,editor,settings,onboarding}/page.tsx`, `src/shared/ui/window-shell.tsx`, `src/shared/motion/presets.ts`, `src/shared/ipc/`, `src-tauri/src/windows_mgr/mod.rs`, `src-tauri/src/commands/`.
- Backend/API involved: comandos `app_info` y `open_window`; sin eventos todavía.
- Known pitfalls: las rutas se generan con `trailingSlash`, así que las URLs llevan barra final (`/line/`); `open_window` rechaza `line`; el editor, los ajustes y el onboarding no existen hasta que se piden; la verificación por CDP necesita `pnpm dev:debug`. Sin toolchain de Rust, `pnpm verify:export` es la única prueba ejecutable del export.
- Design: `docs/design/01-linea-desplegada.png`.

## Línea (M1b-M1c reales; gestos quedan para M2)

- Qué es (punto de vista del usuario): una cuerda en el borde superior de la pantalla donde cada captura nueva cuelga como miniatura.
- Sub-features: despliegue al rozar el borde, despliegue por atajo, ocultarse sola, animación de caída al colgar, etiqueta "Nueva", máximo de miniaturas con descolgado de la más antigua, ocultarse en pantalla completa, miniaturas generadas en Rust.
- Cómo se llega: haciendo una captura (Win + Impr Pant), llevando el cursor al borde superior o pulsando Ctrl + Alt + T.
- Atajos: Ctrl + Alt + T (configurable en M4).
- Selectores para control programático: `clothes-line`, `thumbnail-<id>`, `peg-<id>`, `thumb-image-<id>`, `thumb-time-<id>`, `thumb-new-<id>`.
- Ubicación del código: `src/features/line/`, `src/app/line/page.tsx`, `src-tauri/src/shelf/`, `src-tauri/src/thumbnails/`, `src-tauri/src/reveal/`, `src-tauri/src/windows_mgr/`, `src-tauri/src/platform/windows/` (pantalla completa, cursor), `src-tauri/src/commands/{get_shelf,watching,line}.rs`.
- Backend/API: eventos `screenshot:added`, `screenshot:removed`, `line:show`, `line:hide`; comandos `get_shelf`, `pause_watching`, `resume_watching`, `set_line_interactive`; miniaturas por el protocolo de assets.
- Trampas conocidas: el clic debe atravesar la ventana fuera de las miniaturas; la ventana transparente no debe robar el foco; escalado DPI por monitor; Motion solo admite 2 keyframes con spring; tras ocultar con el atajo la zona del borde queda desarmada hasta que el cursor la abandona.
- Diseño: `docs/design/01-linea-desplegada.png`.

## Vigilante de capturas (M1a real; miniaturas quedan para M1b)

- Qué es (punto de vista del usuario): Pinza se da cuenta sola de las capturas nuevas.
- Sub-features: detección de la carpeta conocida de Windows, carpeta propia, espera a que el PNG termine de escribirse, pausar la vigilancia, lista de capturas colgadas con tope de 10 (la más antigua se descuelga sin borrar el fichero).
- Cómo se llega: no hay interfaz; se configura en Ajustes > Capturas y en el paso 1 del asistente.
- Atajos: ninguno.
- Selectores para control programático: ninguno (se dirige con `pnpm seed:screenshots`).
- Ubicación del código: `src-tauri/src/watcher/`, `src-tauri/src/shelf/`, `src-tauri/src/thumbnails/`, `src-tauri/src/commands/{get_shelf,watching,line}.rs`, `src/features/line/`.
- Backend/API: emite `screenshot:added` y `screenshot:removed`; comandos `get_shelf`, `pause_watching`, `resume_watching`, `set_line_interactive`; miniaturas por el protocolo de assets desde la caché de datos.
- Selectores para control programático: `clothes-line`, `thumbnail-<id>`, `peg-<id>`, `thumb-image-<id>`, `thumb-time-<id>`, `thumb-new-<id>`.
- Trampas conocidas: el Recortes puede escribir en varios pasos; la carpeta puede estar redirigida (OneDrive); nunca vigilar la carpeta real en las pruebas.

## Gestos sobre miniaturas (M2 real; arrastre a Papelera y editor completos quedan para M2b/M3)

- Qué es (punto de vista del usuario): actuar sobre una captura directamente desde la línea.
- Sub-features: barra de acciones al pasar el ratón, clic para copiar, mantener 0,4 s para anotar, doble clic para abrir con el visor predeterminado, arrastrar fuera a una carpeta o a otra app, mover a la Papelera de reciclaje.
- Cómo se llega: desplegar la línea y pasar el ratón o hacer clic en una miniatura.
- Atajos: ninguno.
- Selectores para control programático: `thumb-actions-<id>`, `thumb-action-copy`, `thumb-action-annotate`, `thumb-action-open`, `thumb-action-trash`, `thumb-hold-ring-<id>`, `thumb-copied-<id>`.
- Ubicación del código: `src/features/line/hanging-thumbnail.tsx` (gestos), `src-tauri/src/commands/file_ops.rs` (`copy_image`, `open_file`, `trash_file`), plugin `drag` invocado desde `src/shared/ipc/client.ts`.
- Backend/API: `tauri-plugin-clipboard-manager`, `tauri-plugin-opener`, `tauri-plugin-drag`, crate `trash`.
- Trampas conocidas: el arrastre nativo no se puede verificar solo por CDP, hace falta `pnpm verify:native`; clic, doble clic y mantener pulsado no deben dispararse entre sí.
- Diseño: `docs/design/02-gestos.png`.

## Editor de anotaciones (M3a-M3b reales: todas las herramientas vectoriales y edición; salida en M3c)

- Qué es (punto de vista del usuario): dibujar sobre una captura y guardar una copia anotada.
- Sub-features reales: abrir la captura concreta a tamaño ajustado, lápiz y resaltador con perfect-freehand, flecha, línea, rectángulo, elipse, texto en línea, pasos numerados autoincrementados, seleccionar/mover/redimensionar con horneado de geometría, cambiar color y grosor del seleccionado, duplicar con Ctrl+D, deshacer y rehacer ilimitados, borrar con Supr, 4 colores rápidos + selector y 3 grosores + deslizador. (Previstas en M3c: pixelar/difuminar, recortar, zoom y desplazamiento, copiar, guardar y cerrar.)
- Cómo se llega: mantener una miniatura 0,4 s o pulsar el lápiz de su barra de acciones.
- Atajos: V, P, H, A, L, R, E, T, N (reales); B y C llegan en M3c. Ctrl+Z, Ctrl+Y y Ctrl+Mayús+Z; Supr; Ctrl+D.
- Selectores para control programático: `annotate-canvas`, `editor-toolbar`, `editor-tool-<name>` (select, pencil, highlighter, arrow, line, rectangle, ellipse, text, step), `editor-undo`, `editor-redo`, `editor-color-<hex>`, `editor-color-picker`, `editor-width-<n>`, `editor-width-slider`, `editor-text-input`, `editor-empty`.
- Ubicación del código: `src/features/annotate/` (store, lienzo, carga de captura), `src/app/editor/page.tsx`, `src-tauri/src/commands/open_window.rs` (objetivo y scope por fichero), `src-tauri/src/commands/file_ops.rs` (`save_annotated` previsto).
- Backend/API: `open_window` con `capturePath`, `get_editor_capture`; el scope de assets se amplía solo al fichero abierto; `save_annotated` previsto (M3c).
- Trampas conocidas: exportar a la resolución original, no a la de pantalla; el fichero original debe conservar el mismo hash; los nodos de Konva viven en canvas (verificar por la API de Konva, no por DOM); el borrador del trazo y el estilo deben ir en refs (eventos en el mismo tick leen closures obsoletos); el paso numerado necesita x/y explícitos en el Group.
- Diseño: `docs/design/03-anotar.png`; evidencia: `docs/design/evidence/m3a-editor.png` y `m3b-editor.png`.

## Ajustes y bandeja (prevista, M4)

- Qué es (punto de vista del usuario): configurar Pinza y controlarla desde la bandeja del sistema.
- Sub-features: iniciar con Windows, atajo, carpeta vigilada, papelera frente a borrado definitivo, modo de despliegue, tiempo visible, máximo de miniaturas, ocultar en pantalla completa, menú de la bandeja (mostrar u ocultar, abrir carpeta, pausar, ajustes, salir) e idioma.
- Cómo se llega: icono de la bandeja > Ajustes…
- Atajos: ninguno propio.
- Selectores para control programático: `settings-<key>`, uno por fila (previstos).
- Ubicación del código: `src/features/settings/`, `src/app/settings/page.tsx`, `src-tauri/src/settings/`, `src-tauri/src/tray/`.
- Backend/API: `tauri-plugin-store`, `tauri-plugin-autostart`, `tauri-plugin-global-shortcut`; evento `settings:changed` (previstos).
- Trampas conocidas: el atajo puede chocar con otras aplicaciones; el menú de la bandeja es nativo, se verifica con `pnpm verify:native`.
- Diseño: `docs/design/04-ajustes-y-bandeja.png`.

## Primer arranque (prevista, M5)

- Qué es (punto de vista del usuario): un asistente de tres pasos la primera vez.
- Sub-features: carpeta de capturas, atajo de teclado, iniciar con Windows.
- Cómo se llega: primer arranque tras la instalación (o con `PINZA_DATA_DIR` vacío).
- Atajos: Intro para avanzar, Esc para volver.
- Selectores para control programático: `onboarding-step-<n>`, `onboarding-next`, `onboarding-back` (previstos).
- Ubicación del código: `src/features/onboarding/`, `src/app/onboarding/page.tsx`.
- Backend/API: comandos `get_default_screenshots_dir`, `complete_onboarding` (previstos).
- Trampas conocidas: debe terminar con la vigilancia activa y la ventana del asistente destruida.
- Diseño: `docs/design/05-primer-arranque.png`.
