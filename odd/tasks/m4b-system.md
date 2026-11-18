# M4b — Sistema: atajo configurable, autostart, instancia única e i18n

> Segunda entrega de M4 (`BRIEF.md` §3 flujo 5). Completa los ajustes del flujo 5: el atajo
> global se configura desde Ajustes (grabando teclas, con detección de conflictos), Pinza
> arranca con Windows opcionalmente, solo hay una instancia viva, y el arranque sin vigilancia
> operativa no bloquea nada. Idioma: documentación en castellano, código en inglés.

## Specs

**S1 — Atajo configurable (BRIEF §3, flujo 5 y flujo 2).**
> Ajustes persistentes: … atajo …
> Ctrl + Alt + T (configurable) la muestra u oculta en cualquier app.
> Atajo de teclado: muestra el predeterminado y permite grabar otro, detectando conflictos.

**S2 — Iniciar con Windows (BRIEF §3, flujo 5 y flujo 6, paso 3).**
> Ajustes persistentes: iniciar con Windows, …
> Iniciar con Windows: activado por defecto, se puede desactivar.

**S3 — Instancia única (BRIEF §4, tabla de crates).**
> tauri-plugin-single-instance

**S4 — Idioma (BRIEF §3, flujo 5; AGENTS L3).**
> i18n: el texto de la interfaz de la bandeja y de ajustes parte del es-ES que ya usa el
> proyecto; la infraestructura queda lista para más idiomas (las cadenas de la bandeja en
> Rust salen de un único sitio).

**S5 — Persistencia y reglas (AGENTS §5.1; M4a).**
> Los ajustes nuevos (atajo, autostart) usan el mismo JSON atómico y el evento
> `settings:changed` de M4a; la web los edita desde Ajustes.

## Fuera de alcance

- Asistente de primer arranque: M5.
- Tiempo visible de la línea: el reveal ya usa valores fijos; su ajuste llega con el M5/M4c si el usuario lo pide.

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | Atajo configurable: el JSON guarda el acelerador, `setup` registra el atajo guardado, cambiarlo en Ajustes re-registra al vuelo con detección de conflicto; grabador de teclas en la web | S1, S5 |
| T2 | Autostart con `tauri-plugin-autostart` y ajuste «iniciar con Windows» (activo por defecto) persistido | S2, S5 |
| T3 | Instancia única con `tauri-plugin-single-instance`: la segunda ejecución enfoca la ventana existente | S3 |
| T4 | Cadenas de la bandeja desde un módulo de textos único (preparado para i18n) | S4 |
| T5 | Verificación en app real: cambiar el atajo y usarlo, autostart registrado en el registro de Windows, segunda instancia enfoca la existente | S1-S4 |

## Log

**L1:** «Ya está. Continúa» → M4a mergeado (PR #9, `f4ce881`); luz verde a M4b. Rama `feature/m4b-system` desde `origin/dev`.
