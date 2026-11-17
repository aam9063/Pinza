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

## Línea (prevista, M1)

- Qué es (punto de vista del usuario): una cuerda en el borde superior de la pantalla donde cada captura nueva cuelga como miniatura.
- Sub-features: despliegue al rozar el borde, despliegue por atajo, ocultarse sola, animación de caída al colgar, etiqueta "Nueva", máximo de miniaturas con descolgado de la más antigua, ocultarse en pantalla completa.
- Cómo se llega: haciendo una captura (Win + Impr Pant), llevando el cursor al borde superior o pulsando Ctrl + Alt + T.
- Atajos: Ctrl + Alt + T (configurable).
- Selectores para control programático: `line-root`, `line-thumb-<id>`, `line-thumb-new-badge` (previstos).
- Ubicación del código: `src/features/line/`, `src/app/line/page.tsx`, `src-tauri/src/shelf/`, `src-tauri/src/windows_mgr/`, `src-tauri/src/platform/windows/` (pantalla completa, cursor).
- Backend/API: eventos `screenshot:added`, `screenshot:removed`, `line:show`, `line:hide`; comando `get_shelf` (previstos).
- Trampas conocidas: el clic debe atravesar la ventana fuera de las miniaturas; la ventana transparente no debe robar el foco; escalado DPI por monitor.
- Diseño: `docs/design/01-linea-desplegada.png`.

## Vigilante de capturas (M1a real; miniaturas quedan para M1b)

- Qué es (punto de vista del usuario): Pinza se da cuenta sola de las capturas nuevas.
- Sub-features: detección de la carpeta conocida de Windows, carpeta propia, espera a que el PNG termine de escribirse, pausar la vigilancia, lista de capturas colgadas con tope de 10 (la más antigua se descuelga sin borrar el fichero).
- Cómo se llega: no hay interfaz; se configura en Ajustes > Capturas y en el paso 1 del asistente.
- Atajos: ninguno.
- Selectores para control programático: ninguno (se dirige con `pnpm seed:screenshots`).
- Ubicación del código: `src-tauri/src/watcher/`, `src-tauri/src/shelf/`, `src-tauri/src/commands/get_shelf.rs`, `src-tauri/src/commands/watching.rs`.
- Backend/API: emite `screenshot:added` y `screenshot:removed`; comandos `get_shelf`, `pause_watching`, `resume_watching`.
- Trampas conocidas: el Recortes puede escribir en varios pasos; la carpeta puede estar redirigida (OneDrive); nunca vigilar la carpeta real en las pruebas.

## Gestos sobre miniaturas (prevista, M2)

- Qué es (punto de vista del usuario): actuar sobre una captura directamente desde la línea.
- Sub-features: barra de acciones al pasar el ratón, clic para copiar, mantener 0,4 s para anotar, doble clic para abrir con el visor predeterminado, arrastrar fuera a una carpeta o a otra app, mover a la Papelera de reciclaje.
- Cómo se llega: desplegar la línea y pasar el ratón o hacer clic en una miniatura.
- Atajos: ninguno.
- Selectores para control programático: `thumb-action-copy`, `thumb-action-annotate`, `thumb-action-open`, `thumb-action-trash`, `thumb-hold-ring` (previstos).
- Ubicación del código: `src/features/line/gestures/`, `src-tauri/src/commands/` (`copy_image`, `open_file`, `trash_file`, `start_drag`).
- Backend/API: `tauri-plugin-clipboard-manager`, `tauri-plugin-opener`, `tauri-plugin-drag`, crate `trash`.
- Trampas conocidas: el arrastre nativo no se puede verificar solo por CDP, hace falta `pnpm verify:native`; clic, doble clic y mantener pulsado no deben dispararse entre sí.
- Diseño: `docs/design/02-gestos.png`.

## Editor de anotaciones (prevista, M3)

- Qué es (punto de vista del usuario): dibujar sobre una captura y guardar una copia anotada.
- Sub-features: seleccionar y mover, lápiz, resaltador, flecha, línea, rectángulo, elipse, texto, numeración de pasos, pixelar o difuminar, recortar, editar objetos después de dibujarlos, deshacer y rehacer, zoom y desplazamiento, copiar, guardar y cerrar.
- Cómo se llega: mantener una miniatura 0,4 s o pulsar el lápiz de su barra de acciones.
- Atajos: V, P, H, A, L, R, E, T, N, B, C para las herramientas; Ctrl+Z y Ctrl+Y; Ctrl+C; Ctrl+S; Ctrl + rueda; Ctrl+0; Supr; Ctrl+D.
- Selectores para control programático: `editor-tool-<name>`, `editor-color-<n>`, `editor-stroke`, `editor-undo`, `editor-copy`, `editor-save`, `editor-canvas` (previstos).
- Ubicación del código: `src/features/annotate/`, `src/app/editor/page.tsx`, `src-tauri/src/commands/` (`save_annotated`).
- Backend/API: comando `save_annotated` (previsto), emite `screenshot:added` para la copia.
- Trampas conocidas: exportar a la resolución original, no a la de pantalla; el fichero original debe conservar el mismo hash.
- Diseño: `docs/design/03-anotar.png`.

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
