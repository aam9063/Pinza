# M1c — Despliegue por borde, atajo y ocultar en pantalla completa

> Tercera y última entrega de M1 (`BRIEF.md` §7). La línea se despliega al llevar el cursor al
> borde superior, se alterna con un atajo global, se oculta sola al salir el ratón y nunca
> aparece con una app en pantalla completa. Los ajustes persistentes de todo esto llegan en M4.
> Idioma: documentación en castellano de España, código en inglés (`L3` del documento de M0).

## Specs

**S1 — Despliegue por borde (BRIEF §3, flujo 2).**
> Llevar el cursor al borde superior de la pantalla (zona de 2 a 4 px) durante ~150 ms la despliega.

**S2 — Atajo global (BRIEF §3, flujo 2).**
> Ctrl + Alt + T (configurable) la muestra u oculta en cualquier app.

**S3 — Auto-ocultar (BRIEF §3, flujo 2).**
> Al salir el ratón de la franja, se oculta tras un retardo corto.

**S4 — Nunca en pantalla completa (BRIEF §3, flujo 2).**
> **Nunca** aparece mientras hay una app en pantalla completa (juegos, vídeo, presentaciones).

**S5 — Eventos hacia la web (BRIEF §5.3).**
> escucha eventos (`screenshot:added`, `screenshot:removed`, `line:show`, `line:hide`, `settings:changed`) y llama comandos tipados.

**S6 — Rust es la fuente de verdad (BRIEF §5.3).**
> **Rust es la fuente de verdad**: lista de capturas colgadas, ajustes, vigilante, atajo, detección de pantalla completa, posición del cursor, operaciones de archivo (copiar, papelera, guardar anotada), generación de miniaturas.

**S7 — Animación (AGENTS §5.2).**
> Animaciones: reutilizar los presets en `src/shared/motion/` (`springDrop`, `springSway`, `slideDown`, `unhang`, `lift`). Animar solo `transform` y `opacity`.

**S8 — Fuera de alcance lo persistente (BRIEF §5, flujo 5).**
> Ajustes persistentes: iniciar con Windows, atajo, carpeta vigilada, papelera vs. borrado definitivo, modo de despliegue (borde, atajo o ambos), tiempo visible, número de miniaturas, ocultar en pantalla completa.
> (M4. Aquí: modo fijo «ambos», atajo fijo `Ctrl+Alt+T`, ocultar en pantalla completa activado.)

## Fuera de alcance

- Ajustes persistentes y configuración del atajo: M4.
- Bandeja: M4.
- Gestos sobre miniaturas: M2.

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | `platform/windows`: posición del cursor (`GetCursorPos`) y detección de pantalla completa (ventana en primer plano cubriendo el monitor) | S1, S4, S6 |
| T2 | Módulo `reveal/`: máquina de estados de la línea (oculta → desplegada → auto-oculta) con zona de borde, permanencia de ~150 ms, retardo de ocultado y bloqueo por pantalla completa; tests de la lógica pura | S1, S3, S4, S6 |
| T3 | Atajo global `Ctrl+Alt+T` con `tauri-plugin-global-shortcut`: alterna mostrar/ocultar en cualquier app | S2, S6 |
| T4 | Web: escuchar `line:show` y `line:hide`, animar la línea con `slideDown`/`lineHidden`, envoltorios IPC y test de Vitest | S5, S7, S8 |
| T5 | Verificación en app real: cursor al borde despliega, sale y se oculta tras el retardo, el atajo alterna, y con una ventana a pantalla completa no aparece | S1-S2-S3-S4 |

## Log

**L1:** «ok sigue» → luz verde a M1c tras el PR #3 de M1b (verde en CI, pendiente de merge). Rama apilada sobre `feature/m1b-thumbnails` porque el despliegue anima la línea que M1b construyó.

**L2:** T1-T5 implementadas y verificadas contra la app real (`pnpm dev:debug` + CDP + cursor y teclado reales, script acotado de ~10 s). Evidencia: la línea nace oculta; rozar el borde ~150 ms la despliega (S1); al salir el ratón se oculta tras el retardo (S3); con una ventana a pantalla completa no aparece (S4, verificada con un formulario bordeless a pantalla completa); Ctrl+Alt+T alterna mostrar/ocultar (S2, comprobado con el cursor dentro de la franja: fuera de ella el auto-ocultado de S3 la cierra, comportamiento correcto). La máquina de estados cubre además el desarme de la zona del borde tras ocultar con el atajo. Checks: `cargo test` 35/35, clippy limpio, `pnpm test` 20/20, typecheck/lint/arch verdes. Commits: 3b042ec (T1), d61294e (T2-T3), 43e217d (T4). Pendiente: push de la rama, revisión RDD y PR contra `dev` (apilado sobre `feature/m1b-thumbnails`, PR #3).
