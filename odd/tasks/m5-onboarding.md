# M5 — Asistente de primer arranque

> Tres pasos (`BRIEF.md` §3 flujo 6) que terminan con la vigilancia activa sobre la carpeta
> elegida: (1) carpeta de capturas con propuesta de la conocida de Windows y aviso del
> Recortes, (2) atajo con grabador y detección de conflictos, (3) iniciar con Windows.
> Idioma: documentación en castellano, código en inglés.

## Specs

**S1 — Paso 1, carpeta (BRIEF §3, flujo 6, paso 1).**
> Carpeta de capturas: se propone la carpeta conocida de Windows (`FOLDERID_Screenshots`, normalmente `Imágenes\Capturas de pantalla`) con opción de cambiarla, y un aviso sobre el autoguardado del Recortes.

**S2 — Paso 2, atajo (BRIEF §3, flujo 6, paso 2).**
> Atajo de teclado: muestra el predeterminado y permite grabar otro, detectando conflictos.

**S3 — Paso 3, autostart (BRIEF §3, flujo 6, paso 3).**
> Iniciar con Windows: activado por defecto, se puede desactivar.

**S4 — Criterio de aceptación del hito (BRIEF §7, M5).**
> Instalación limpia lleva al asistente y termina con la vigilancia activa.

**S5 — Reutilización de M4a/M4b (AGENTS §5.2).**
> Los ajustes se guardan por el mismo `set_settings` con evento `settings:changed`; el
> grabador de atajo reutiliza el patrón de la ventana settings; cambiar la carpeta reinicia
> el vigilante sobre la nueva ruta; todo con `data-testid`.

## Fuera de alcance

- Instalador: M6.
- Cuándo se abre el asistente (detección de instalación limpia): la ventana `onboarding` existe y se abre bajo demanda; el disparo automático en el primer arranque se añade aquí desde el shell si es barato, si no queda anotado.

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | Shell: comando para reiniciar la vigilancia sobre una carpeta dada (`restart_watching`) probado con carpeta temporal; abrir el asistente en el arranque cuando no hay ajustes guardados (instalación limpia) | S4, S5 |
| T2 | Asistente web de 3 pasos reutilizando el grabador de M4b y `set_settings`; al terminar aplica carpeta + atajo + autostart y cierra | S1-S3, S5 |
| T3 | Verificación en app real: flujo completo del asistente, vigilancia activa sobre la carpeta elegida al terminar | S1-S4 |

## Log

**L1:** «continúa» → M4b mergeado (PR #10, `15345bb`); luz verde a M5. Rama `feature/m5-onboarding` desde `origin/dev`.

**L2:** T1-T3 implementadas y verificadas contra la app real. Evidencia: con la carpeta de datos sin `settings.json` el shell abre el asistente solo (instalación limpia, criterio de M5); el paso 1 propone `C:\Users\...\Pictures\Screenshots` (FOLDERID_Screenshots) con el aviso del Recortes; el paso 2 muestra `ctrl+alt+t` con el grabador; el paso 3 trae autostart activado; al terminar, `restart_watching` deja la vigilancia activa sobre la carpeta elegida (captura sembrada cuelga en la línea) y el asistente se cierra. Checks: `cargo test` 53/53 (2 de validación de carpeta), `pnpm test` 45/45, clippy limpio, typecheck/lint/arch verdes. Commits: 594fe5b. Pendiente: push, revisión RDD y PR.
