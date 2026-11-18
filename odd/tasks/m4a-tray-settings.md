# M4a — Bandeja y ajustes persistentes

> Primera entrega de M4 (`BRIEF.md` §3 flujo 5). Icono en la bandeja con su menú y la ventana
> `settings` real, con los ajustes persistidos por Rust entre sesiones. Autostart, instancia
> única e i18n llegan en M4b. Idioma: documentación en castellano de España, código en inglés.

## Specs

**S1 — Menú de la bandeja (BRIEF §3, flujo 5).**
> Icono en la bandeja con menú: Mostrar u ocultar la línea, Abrir carpeta de capturas, Pausar la vigilancia, Ajustes…, Salir.

**S2 — Ajustes persistentes (BRIEF §3, flujo 5).**
> Ajustes persistentes: iniciar con Windows, atajo, carpeta vigilada, papelera vs. borrado definitivo, modo de despliegue (borde, atajo o ambos), tiempo visible, número de miniaturas, ocultar en pantalla completa.
> (M4a: carpeta vigilada, papelera vs. borrado, modo de despliegue, número de miniaturas, ocultar en pantalla completa. Atajo configurable y "iniciar con Windows" en M4b con autostart.)

**S3 — Rust es la fuente de verdad (BRIEF §5.3).**
> **Rust es la fuente de verdad**: lista de capturas colgadas, ajustes, vigilante…
> Los ajustes viven en Rust (crate `tauri-plugin-store` o JSON propio) y la web los lee y
> propone cambios por comandos tipados; un evento `settings:changed` avisa a las ventanas.

**S4 — El número de miniaturas se aplica (BRIEF §3, flujo 3).**
> Con más de N miniaturas (10 por defecto) la más antigua se descuelga de la línea; **el archivo nunca se borra por esto**.

**S5 — Operaciones y reglas del repo (AGENTS §5.1/§5.2).**
> File operations live only in `src-tauri/src/commands/` and are tested against temp folders
> Cada control de la ventana settings con `data-testid`; el mapa de features se actualiza en el mismo PR.

## Fuera de alcance (M4b)

- Atajo configurable (grabar otro), iniciar con Windows (autostart), instancia única, i18n.
- Tiempo visible de la línea (M4b con el motor de reveal).

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | `settings/` en Rust: struct `Settings` con defaults, carga/guardado persistente en la carpeta de datos, comando `get_settings`, `set_settings` y evento `settings:changed`; pruebas contra carpeta temporal | S2, S3, S5 |
| T2 | Bandeja: icono con menú (mostrar/ocultar línea, abrir carpeta, pausar/reanudar vigilancia, ajustes, salir) cableado al shell | S1 |
| T3 | El tope de la línea lee el número de miniaturas de los ajustes; cambiarlo re-aplica la cola | S4 |
| T4 | Ventana `settings` real: controles para los ajustes de M4a con envoltorios IPC y test de Vitest | S2, S3 |
| T5 | Verificación en app real: menú de la bandeja funciona, los ajustes sobreviven a un reinicio de la app, el tope cambiado re-aplica la cola | S1-S4 |

## Log

**L1:** «continuamos con M4?» → M3 completo mergeado (PR #8, `114cd69`); luz verde a M4 con el troceado M4a/M4b. Rama `feature/m4a-tray-settings` desde `origin/dev`.

**L2:** T1-T5 implementadas y verificadas contra la app real. Evidencia: la bandeja se crea sin errores de arranque; la ventana settings real carga el valor actual en cada control; cambiar el tope a 3 muestra «Guardado» y la cola re-aplica al vuelo (6 capturas sembradas → 3 en `get_shelf` con sus eventos `screenshot:removed`); el JSON persiste en la carpeta de datos (`maxThumbnails: 3`) y tras reiniciar la app los ajustes cargan del disco. La carpeta temporal cambia entre sesiones del harness (PINZA_DATA_DIR distinto por defecto); la persistencia real se verificó fijando el mismo directorio en dos arranques. Checks: `cargo test` 49/49 (5 de settings + 1 de cola re-aplicada), `pnpm test` 45/45, typecheck/lint/arch verdes. Commits: ac3f3f4 (T1), 226159d (T2), 2eb1054 (T3), 10212ae (T4). Pendiente: push, revisión RDD y PR.
