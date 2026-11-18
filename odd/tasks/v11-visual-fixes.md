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
