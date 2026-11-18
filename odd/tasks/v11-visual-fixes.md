# v1.1 — Correcciones de la máquina limpia y animación de tendido

> Fallos que Albert encontró al probar el instalador en su portátil de 14" (Windows en modo
> oscuro) y en el monitor de 27", más una petición de animación inspirada en Tendedero.
> Idioma: castellano, código en inglés.

## Specs

**S1 — Input invisible (L1 de Albert, Imagen 1).**
> «en el input para poner la ruta a la carpeta de capturas no se ve el texto no se distingue del blanco»
> (asistente, paso 1, Windows en modo oscuro)

**S2 — Ventana del paso 2 en negro (L1 de Albert, Imagen 2).**
> «luego aqui en Primeros pasos no se ve nada»
> (paso 2 del asistente, ventana completamente en negro)

**S3 — Línea cortada en pantallas con escalado (L1 de Albert, Imagen 3).**
> «cuando descuelgo arriba la UI no se ven del todo las imagenes ni para abrir el editor de imagenes»
> (monitor de 27"; el portátil es de 14" — sospecha de escalado de DPI confirmada en el código:
> `attach_line_to_primary_monitor` fija 160 píxeles FÍSICOS, no lógicos)

**S4 — Animación de tendido (L1 de Albert).**
> «al hacer la captura de pantalla hace como una animacion y como que se 'tiende' en la cuerda,
> es decir, viaja hacia la cuerda para colgarse» (comportamiento de Tendedero en macOS)

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | Inputs y superficies con colores del tema (`bg-surface`, nunca `bg-white` con `text-ink`) en asistente y ajustes; reproducido en modo oscuro por CDP | S1 |
| T2 | Investigar y corregir la ventana en negro del paso 2 en modo oscuro | S2 |
| T3 | Línea con tamaño LÓGICO (escala con el DPI); verificar click-through y miniaturas completas | S3 |
| T4 | Animación de tendido: la miniatura nueva vuela desde abajo hasta la cuerda y se balancea al colgarse | S4 |
| T5 | Verificación en modo oscuro y claro + reinstalador para que Albert repita la prueba | S1-S4 |

## Log

**L1 (petición de Albert, textual):** «Tiene fallos. O sea se instala y demás pero visualmente tiene bugs: primero aqui en el input para poner la ruta a la carpeta de capturas no se ve el texto no se distingue del blanco, luego aqui en Primeros pasos no se ve nada y ultimo que he visto cuando descuelgo arriba la UI no se ven del todo las imagenes ni para abrir el editor de imagenes. Lo que te he de decir es que lo he probado en mi portatil de 14" y mi pc tiene un monitor de 27". No se si la ultima imagen tiene algo que ver en eso pero no me mola. Y si que me gustaria y es que en la app de tendedero (la original para mac) al hacer la captura de pantalla hace como una animacion y como que se 'tiende' en la cuerda, es decir, viaja hacia la cuerda para colgarse»

**L2:** T1-T4 implementadas y verificadas. Evidencia: (1) inputs con `bg-surface-raised` — captura en modo oscuro (docs/design/evidence/onboarding-dark.png) muestra el texto legible; (2) `WindowShell` da fondo de tema a las ventanas que no son la línea — la ventana negra antes del primer render no vuelve; el paso 2 en modo oscuro emulado renderiza completo (CDP: sección visible con 3 hijos); (3) la franja de la línea ahora se fija en píxeles lógicos escalados por el scale_factor del monitor (160 lógicos × 1,5 = 240 físicos en el portátil) — el contenido en px CSS ya no queda recortado; (4) animación de tendido verificada con muestras de CDP: la miniatura entra en vuelo con translateY(513px), escala 1,24 y rotación ~5°, sobrepasa el muelle hasta −42 px y se asienta en la cuerda con el balanceo del trazo. Checks: `cargo test` 53/53, `pnpm test` 45/45, clippy limpio, typecheck/lint/arch verdes. Commits: 6f5598a (S1), 1439c8e (S2), 0f259f1 (S3), animación (S4). Pendiente: push, revisión RDD, PR y reinstalador para Albert.

**L3 (tras la prueba de Albert en el portátil):** «La captura no vuela hacia la cuerda, ese paso no va. Luego cuando paso el raton sobre la captura el menu ... se quita en seguida tengo que mover el raton muy despacio ... y estaria bien que el puntero fuese una mano en vez de la flecha». Causas: (1) la animación existía pero la línea estaba oculta, así que el vuelo ocurría fuera de la vista — ahora `hang_screenshot` pide `request_show()` y el sondeo despliega la línea con `RevealMachine::show` (respeta pantalla completa; test nuevo); verificado con la línea oculta: se despliega y el transform muestra translateY 722→552→366 con escala y rotación decrecientes; (2) el click-through publicaba rects exactos y con escalado DPI el cursor rozaba el borde apagando el ratón — margen de 8 px físicos; verificado en centro, borde y 1 px dentro; (3) `cursor-pointer` en la figura. Checks: cargo test 54/54, pnpm test 45/45, clippy limpio.

**L4 (segunda ronda de la prueba de Albert):** «se descuelga la cuerda y aparece, pero lo que quiero es que se desplace hacia la cuerda» y «el pointer lo hace entre iconos y sigue desapareciendo en seguida». Causas: (1) el vuelo arrancaba a la vez que la revelación y la miniatura viajaba con la franja aún fuera de vista — ahora el vuelo lleva `delay: 0.3` (baja la franja, luego vuela la captura a la vista); verificado muestreando: con la línea a opacidad 1 la miniatura aparece con opacidad 0.5→0.93 y translateY 139→-42; (2) el sondeo comprobaba `cursor_in_strip` contra LINE_HEIGHT fijo (160 físicos) mientras la franja mide 240 al 150 %: al bajar el ratón hacia la barra se salía de la cota y el click-through apagaba el ratón — ahora se guarda el alto físico real en LineGeometry. Verificado: la barra se mantiene con el cursor sobre ella y en el borde inferior. Checks: cargo test 54/54, pnpm test 45/45, clippy limpio, typecheck/lint/arch verdes.

**L5 (arrastre a carpetas, petición de Albert):** «hay una funcionalidad que me hubiera gustado tener: drag and drop desde la cuerda a cualquier carpeta». Estaba cableado desde M2 pero nunca funcionó; tres causas encadenadas: (1) el payload no coincidía con el contrato serde del crate `drag` — `item` debe ser el array de rutas y `image` una RUTA al fantasma (enviábamos `{ files: [...] }` y bytes vacíos); (2) faltaba el permiso `drag:default` en `capabilities/default.json` (la consola lo decía: «drag.start_drag not allowed»); (3) el arrastre nativo tiene que arrancar con el botón pulsado — el `dragstart` de HTML5 llega tarde y DoDragDrop se quedaba esperando un botón ya soltado, así que ahora se inicia desde `pointermove` (umbral 6 px); (4) además las `<img>` son arrastrables por defecto y el drag HTML5 del navegador soltaba la ruta de la miniatura como texto: se marca `draggable={false}`. Verificado con un arrastre real (SendInput: botón abajo, 24 pasos, soltar sobre una ventana del Explorador abierta en una carpeta temporal): el fichero original aparece en el destino. Checks: pnpm test 45/45, typecheck/lint/arch verdes, cargo test 54/54.
