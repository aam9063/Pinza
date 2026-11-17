# BRIEF: Pinza

> Brief de arranque para los agentes que van a construir el proyecto desde cero.
> Léelo junto con `AGENTS.md` (cómo trabajamos) y las pantallas de `docs/design/` (qué construimos).
> "Pinza" es un nombre de trabajo. Si cambia, se sustituye en todo el repo con un buscar y reemplazar.

---

## 1. Qué es Pinza

Pinza es una app de escritorio para **Windows 10/11** que cuelga cada captura de pantalla nueva en una "cuerda de tender" que aparece en el borde superior de la pantalla. Desde esa cuerda el usuario copia, anota, abre, arrastra o tira cada captura sin buscarla en el Explorador.

Es una reinterpretación para Windows de [Tendedero](https://github.com/alejandrobujan/tendedero), una app de macOS (Swift, MIT). **No portamos ni copiamos su código**: lo construimos desde cero con otro stack. Su nombre e icono están excluidos de la licencia, así que Pinza tiene identidad propia.

### Principios de producto

- **Cero fricción**: la app vive en la bandeja del sistema y en una franja transparente arriba. No hay ventana principal.
- **No sustituye a la herramienta de captura de Windows.** Win + Impr Pant y el Recortes (Win + Mayús + S) siguen capturando como siempre; Pinza vigila la carpeta donde se guardan y reacciona.
- **Privacidad total**: sin cuentas, sin red, sin analítica. Todo es local.
- **Se siente viva**: animaciones físicas (muelles, balanceo de las pinzas, caída al descolgar), siempre a 60 fps y respetando "reducir movimiento" de Windows.
- **Idiomas**: español e inglés desde el día uno.
- **La v1 sale completa**: incluye el editor de anotaciones entero (sección 3, flujo 4). Se prioriza terminarla bien antes que sacarla rápido; ninguna feature de este brief se deja "para la v2" sin que Albert lo apruebe.

---

## 2. Diseño de referencia

Las 5 pantallas están en `docs/design/` (PNG 2560x1600, renderizadas desde el lienzo de diseño a 1280x800 @2x). Son un **boceto de flujos y jerarquía**, no un pixel perfect: el estilo visual se puede pulir, pero los flujos, las acciones y los textos son los acordados.

| Archivo | Pantalla | Qué fija |
|---|---|---|
| `01-linea-desplegada.png` | Línea desplegada | La cuerda con pinzas, miniaturas ligeramente giradas, la más nueva a la izquierda con etiqueta "Nueva", hora debajo de cada una y barra de acciones al pasar el ratón (copiar, anotar, abrir, papelera). |
| `02-gestos.png` | Gestos | Clic copia, mantener pulsado 0,4 s abre el editor, doble clic abre el visor de Windows, arrastrar lleva la imagen a una carpeta, a otra app o a la papelera. |
| `03-anotar.png` | Editor de anotaciones | Ventana propia con herramientas (seleccionar, lápiz, flecha, rectángulo, texto, resaltador), 4 colores, grosor, Deshacer, Copiar y "Guardar y cerrar". Guarda una copia `_anotada.png`; el original nunca se toca. |
| `04-ajustes-y-bandeja.png` | Ajustes y bandeja | Ventana de ajustes (General, Capturas, Línea) y menú del icono de la bandeja. |
| `05-primer-arranque.png` | Primer arranque | Asistente de 3 pasos: carpeta de capturas, atajo de teclado, iniciar con Windows. |

Lienzo editable original: https://claude.ai/artifact/6YRd9AqVBbGxixC9CXU6Wj

### Lenguaje visual

- Estética Windows 11 sobria: fuente Segoe UI Variable (fallback `system-ui`), esquinas de 8 a 12 px, sombras suaves, un único acento azul (`#1D4FBF` en controles, `#2F6FEB` en etiquetas).
- Las miniaturas parecen fotos colgadas: fondo blanco, borde fino, sombra, rotación aleatoria entre -2° y 2°, pinza de madera (`#C99A5B`).
- Modo claro y oscuro siguiendo el tema de Windows. Contraste mínimo AA (4.5:1).
- Iconos de trazo (Lucide), nunca emojis.

---

## 3. Flujos funcionales

### Flujo 1: aparece una captura (pantalla 01)
1. El usuario captura con Win + Impr Pant o con el Recortes con autoguardado.
2. El vigilante de archivos detecta el PNG nuevo en la carpeta de capturas.
3. La línea baja con animación de muelle, la miniatura nueva cae y se cuelga a la izquierda con un pequeño balanceo, y aparece la etiqueta "Nueva".
4. La línea se queda visible 3 s (configurable) y se oculta sola si el ratón no está encima.

### Flujo 2: mostrar y ocultar la línea
- Llevar el cursor al borde superior de la pantalla (zona de 2 a 4 px) durante ~150 ms la despliega.
- Ctrl + Alt + T (configurable) la muestra u oculta en cualquier app.
- Al salir el ratón de la franja, se oculta tras un retardo corto.
- **Nunca** aparece mientras hay una app en pantalla completa (juegos, vídeo, presentaciones).

### Flujo 3: gestos sobre una miniatura (pantalla 02)
| Gesto | Acción | Feedback |
|---|---|---|
| Hover | Muestra la barra de acciones | La miniatura se endereza y sube 2 px |
| Clic | Copia la imagen al portapapeles | Pastilla "Copiada" 1,2 s |
| Mantener 0,4 s | Abre el editor de anotaciones | Anillo de progreso que se llena |
| Doble clic | Abre con el visor predeterminado de Windows | Ninguno extra |
| Arrastrar | Arrastre nativo del archivo a Explorador, chat, correo o documento | La miniatura se despega con sombra elevada |
| Papelera (botón o arrastre a la Papelera) | Envía el archivo a la Papelera de reciclaje | La pinza se abre y la miniatura cae |

Con más de N miniaturas (10 por defecto) la más antigua se descuelga de la línea; **el archivo nunca se borra por esto**.

### Flujo 4: anotar (pantalla 03)
1. Se abre una ventana normal (con marco) con la captura a tamaño ajustado.
2. Herramientas vectoriales sobre la imagen; Deshacer con Ctrl+Z.
3. "Copiar" copia la imagen anotada; "Guardar y cerrar" escribe `captura_<fecha>_<hora>_anotada.png` junto al original y la cuelga en la línea como captura nueva.

**El editor va completo en la v1.** Alcance cerrado:

| Grupo | Funciones |
|---|---|
| Herramientas | Seleccionar y mover, lápiz libre, resaltador, flecha, línea, rectángulo, elipse, texto, numeración de pasos (círculos 1, 2, 3… que se autoincrementan), pixelar o difuminar una zona (ocultar datos sensibles), recortar. |
| Edición | Cada anotación es un objeto: seleccionar, mover, redimensionar, cambiar color y grosor después de dibujarla, borrar con Supr, duplicar con Ctrl+D. |
| Estilo | 4 colores rápidos + selector de color, 3 grosores + deslizador, tamaño de texto. |
| Historial | Deshacer (Ctrl+Z) y rehacer (Ctrl+Y / Ctrl+Mayús+Z) ilimitados durante la sesión. |
| Vista | Zoom con Ctrl + rueda y Ctrl + 0 para ajustar, desplazamiento con espacio + arrastre. |
| Salida | Copiar al portapapeles (Ctrl+C sin selección), Guardar y cerrar (Ctrl+S), cerrar sin guardar pide confirmación si hay cambios. Exporta a la resolución original de la captura, no a la de pantalla. |
| Atajos | Una letra por herramienta (V, P, H, A, L, R, E, T, N, B, C) mostrada en el tooltip. |

La pantalla 03 muestra las 6 herramientas principales; las demás (línea, elipse, numeración, pixelar, recortar) siguen el mismo estilo en la misma barra.

### Flujo 5: ajustes y bandeja (pantalla 04)
- Icono en la bandeja con menú: Mostrar u ocultar la línea, Abrir carpeta de capturas, Pausar la vigilancia, Ajustes…, Salir.
- Ajustes persistentes: iniciar con Windows, atajo, carpeta vigilada, papelera vs. borrado definitivo, modo de despliegue (borde, atajo o ambos), tiempo visible, número de miniaturas, ocultar en pantalla completa.

### Flujo 6: primer arranque (pantalla 05)
1. Carpeta de capturas: se propone la carpeta conocida de Windows (`FOLDERID_Screenshots`, normalmente `Imágenes\Capturas de pantalla`) con opción de cambiarla, y un aviso sobre el autoguardado del Recortes.
2. Atajo de teclado: muestra el predeterminado y permite grabar otro, detectando conflictos.
3. Iniciar con Windows: activado por defecto, se puede desactivar.

---

## 4. Stack

Versiones de referencia a fecha de este brief (17 nov 2026). Al crear el repo, instalar la **última estable** de cada una y fijarla en el lockfile.

| Capa | Tecnología | Notas |
|---|---|---|
| Shell nativo | **Tauri 2** (2.12 o superior) + **Rust** estable | Ventanas, bandeja, IPC, empaquetado. Rust es parte del stack, no un extra: vigilante de archivos, miniaturas, portapapeles, papelera, arrastre nativo, ventana transparente y llamadas a Win32 se hacen ahí (ver 5.3). |
| UI | **Next.js 16.4** (App Router) + **React 19** + **TypeScript estricto (TSX)** | Siempre como **exportación estática** (`output: 'export'`). Ver 5.1. |
| Estilos | **Tailwind CSS v4** | Tokens de diseño en el `@theme` de Tailwind. |
| Animación | **Motion** (`motion/react`, antes Framer Motion) | Muelles, `layout`, `AnimatePresence`, gestos de arrastre visual. Es la librería de animación principal. |
| Trazos del editor | **perfect-freehand** | Lápiz y resaltador con trazo natural. |
| Lienzo del editor | **Konva** + **react-konva** | Capas vectoriales, selección, exportar a PNG. |
| Iconos | **lucide-react** | |
| Estado UI | **Zustand** | Un store por ventana; el estado fuente de verdad vive en Rust. |
| Gestor de paquetes | **pnpm** | |
| Calidad | ESLint (flat config, typescript-eslint), Prettier, dependency-cruiser, `cargo clippy`, `rustfmt` | |
| Tests | Vitest + Testing Library (UI), `cargo test` (Rust), Playwright conectado por CDP a WebView2 (E2E y verificación) | |

No añadir otra librería de animación (GSAP, react-spring, Lottie…) salvo que Motion no pueda resolver un caso concreto, justificándolo en el documento de la feature.

### Plugins y crates de Tauri previstos

| Necesidad | Solución |
|---|---|
| Vigilar la carpeta | crate `notify` (con debounce; esperar a que el PNG termine de escribirse) |
| Atajo global | `tauri-plugin-global-shortcut` |
| Copiar imagen | `tauri-plugin-clipboard-manager` |
| Abrir con el visor predeterminado | `tauri-plugin-opener` |
| Arrastre nativo de archivos hacia otras apps | `tauri-plugin-drag` (CrabNebula, `drag-rs`) |
| Papelera de reciclaje | crate `trash` |
| Iniciar con Windows | `tauri-plugin-autostart` |
| Ajustes persistentes | `tauri-plugin-store` |
| Instancia única | `tauri-plugin-single-instance` |
| Logs | `tauri-plugin-log` |
| Miniaturas | crate `image` (generadas en Rust, nunca cargar el PNG completo en la línea) |
| Pantalla completa, carpeta conocida, cursor | crate `windows` (`SHQueryUserNotificationState`, `SHGetKnownFolderPath`, `GetCursorPos` si la API de Tauri no basta) |

---

## 5. Arquitectura

### 5.1 Next.js dentro de Tauri

Tauri sirve archivos estáticos al WebView2, así que **no hay servidor de Next.js en producción**:

- `next.config.ts`: `output: 'export'`, `images: { unoptimized: true }`.
- Prohibido: Server Actions (`"use server"`), Route Handlers, middleware, `next/headers`, `cookies()`, ISR, `next/image` con loader por defecto. Todo componente que use APIs de Tauri es `"use client"`.
- Cada ventana de Tauri carga **una ruta** del export estático. Verificar en el primer hito que las cuatro rutas cargan en el build de producción (no solo en `next dev`).

### 5.2 Ventanas

| Ventana | Ruta | Configuración |
|---|---|---|
| `line` | `/line` | Sin marco, transparente, siempre encima, fuera de la barra de tareas, ancho completo del monitor principal, sin sombra. Ignora el ratón salvo encima de las miniaturas (alternar `set_ignore_cursor_events` según la zona). |
| `editor` | `/editor` | Ventana normal, se crea al anotar y se destruye al cerrar. Recibe la ruta del archivo. |
| `settings` | `/settings` | Ventana normal, única. |
| `onboarding` | `/onboarding` | Solo en el primer arranque. |
| Bandeja | (Rust) | Menú nativo de Tauri. |

### 5.3 Reparto Rust / web

- **Rust es la fuente de verdad**: lista de capturas colgadas, ajustes, vigilante, atajo, detección de pantalla completa, posición del cursor, operaciones de archivo (copiar, papelera, guardar anotada), generación de miniaturas.
- **La web solo pinta y emite intenciones**: escucha eventos (`screenshot:added`, `screenshot:removed`, `line:show`, `line:hide`, `settings:changed`) y llama comandos tipados.
- Toda llamada a Tauri desde la web pasa por **una única capa IPC tipada** (`src/shared/ipc/`). Ningún componente importa `@tauri-apps/api` directamente.
- Las miniaturas llegan a la web como rutas servidas por el protocolo de assets de Tauri, con el scope limitado a la carpeta de miniaturas.

### 5.4 Estructura del repo

```
pinza/
├── AGENTS.md
├── BRIEF.md
├── docs/
│   ├── design/            # 5 pantallas de referencia
│   └── feature-map.md
├── odd/tasks/             # documentos de feature de ODD (los crea el flujo)
├── src/                   # Next.js (App Router, export estático)
│   ├── app/
│   │   ├── line/page.tsx
│   │   ├── editor/page.tsx
│   │   ├── settings/page.tsx
│   │   └── onboarding/page.tsx
│   ├── features/
│   │   ├── line/          # cuerda, miniaturas, gestos, barra de acciones
│   │   ├── annotate/      # editor
│   │   ├── settings/
│   │   └── onboarding/
│   └── shared/
│       ├── ipc/           # única puerta a Tauri (comandos y eventos tipados)
│       ├── motion/        # presets de muelles y transiciones
│       ├── i18n/          # es, en
│       └── ui/            # componentes base
├── src-tauri/
│   └── src/
│       ├── main.rs
│       ├── commands/      # comandos expuestos a la web
│       ├── watcher/       # notify + debounce
│       ├── shelf/         # estado de la línea (capturas colgadas)
│       ├── thumbnails/
│       ├── settings/
│       ├── tray/
│       ├── windows_mgr/   # creación y posición de ventanas
│       └── platform/windows/  # único sitio con Win32 y `unsafe`
└── e2e/                   # Playwright por CDP contra WebView2
```

---

## 6. Animación y rendimiento

- Solo se animan `transform` y `opacity`. Nada de animar `width`, `top`, `box-shadow` en bucle.
- Presets centralizados en `src/shared/motion/`: `springDrop` (caída al colgar), `springSway` (balanceo de la pinza), `slideDown` (aparición de la línea), `unhang` (descolgar y caer), `lift` (arrastre).
- `MotionConfig reducedMotion="user"` en la raíz de cada ventana: con "reducir movimiento" activado, todo pasa a fundidos cortos.
- Presupuestos:
  - 60 fps en desplegar, colgar y descolgar (cada frame < 16 ms).
  - Línea oculta: CPU en reposo ~0 % (sin `requestAnimationFrame` ni polling desde la web).
  - De captura guardada a miniatura visible: < 300 ms.
  - Memoria de la app completa en reposo con 10 miniaturas: objetivo < 150 MB.

---

## 7. Hitos

Cada hito es una o varias features de ODD (`odd/tasks/<feature>.md`). Orden recomendado:

| Hito | Contenido | Criterio de cierre |
|---|---|---|
| **M0 Andamiaje** | Tauri 2 + Next.js export estático + Tailwind + pnpm; ESLint, typecheck, Vitest, dependency-cruiser, clippy; las 4 rutas cargan en build; habilidad de verificación por CDP funcionando; CI en GitHub Actions `windows-latest`. | `pnpm verify` en verde en local y en CI; captura de cada ventana abierta. |
| **M1 Vigilante + línea** | Watcher, miniaturas, ventana `line` transparente, colgar y descolgar con animación, despliegue por borde y por atajo. | Una captura real aparece en < 300 ms; clics fuera de las miniaturas llegan a la app de debajo. |
| **M2 Gestos** | Copiar, abrir, arrastrar fuera, papelera, mantener pulsado. | Cada gesto verificado en la app corriendo, incluido arrastrar a una carpeta del Explorador. |
| **M3 Editor** | Editor completo según el alcance del flujo 4 (todas las herramientas, edición de objetos, historial, zoom, atajos). Se puede partir en varias features de ODD (`annotate-core`, `annotate-tools`, `annotate-redact-crop`, `annotate-export`). | Cada herramienta verificada en la app corriendo; el original queda intacto (hash igual); la copia exportada tiene la resolución original y se cuelga sola. |
| **M4 Sistema** | Bandeja, ajustes persistentes, autostart, pantalla completa, instancia única, i18n. | La línea no aparece con un vídeo a pantalla completa; ajustes sobreviven a reinicios. |
| **M5 Primer arranque** | Asistente de 3 pasos. | Instalación limpia lleva al asistente y termina con la vigilancia activa. |
| **M6 Distribución** | Instalador NSIS/MSI con el bundler de Tauri, icono propio, versión. Firma de código queda fuera de v1 (SmartScreen avisará). | Instalar, usar y desinstalar en una máquina limpia. |

---

## 8. Metodología: ODD + RDD con gentle-ai / gentle-shell

Trabajamos con el ecosistema **gentle-ai** de Gentleman Programming, usando **gentle-shell** (la integración para Pi) como espacio de trabajo de los agentes.

### ODD (Organic Driven Development)

ODD es el flujo por defecto de gentle-ai desde la v3. Pasos: **Authorize, Explore, Resolve uncertainty, Classify, Track (antes de la primera escritura), Implement tarea a tarea y Close**.

- El trabajo pequeño se resuelve en línea. El trabajo sustancial tiene **un único documento de feature** en `odd/tasks/<feature-name>.md` con: objetivo, problema y porqué, alcance y restricciones, checklist accionable con IDs estables y criterios de aceptación, evidencias de verificación, progreso y siguiente paso.
- Ese documento se refleja completo en Engram (tema `odd/<feature-name>/tasks`), así el trabajo sobrevive a interrupciones y se retoma donde quedó.
- Un cambio aceptado actualiza intención y tareas a la vez: se conserva lo completado válido, se añaden tareas y se reabren con motivo las invalidadas.
- **TDD activado** en este proyecto: RED observado, luego GREEN, luego REFACTOR, con Vitest en la web y `cargo test` en Rust.
- Los hitos del punto 7 son el punto de partida para los documentos de feature; el agente los afina en Explore y Classify.

### RDD (Receipt-Driven Development)

RDD es la revisión nativa de gentle-ai, un interruptor que controla el usuario. **Activado en este proyecto**:

```
gentle-ai review mode enable
gentle-ai review mode status
```

- La revisión **congela el cambio** antes de evaluarlo y liga las evidencias a Git, no a lo que el agente cuenta.
- Se aplica en cada entrega (cada PR a `dev`). Un hallazgo de revisión no autoriza por sí solo ampliar el alcance: si hace falta, se registra en el documento de la feature.
- Las evidencias que pide `AGENTS.md` (capturas de la app corriendo, salida de tests, trazas) forman parte del recibo.

### Git

- Ramas: `main` → `dev` → `feature/<nombre>` y `fix/<nombre>`.
- Los agentes crean la rama desde `dev`, hacen commits atómicos, push y abren PR **contra `dev`** de forma automática.
- **`dev` → `main` lo hace siempre Albert a mano.** Ningún agente toca `main`.
- Commits con Conventional Commits (`feat(line): ...`, `fix(watcher): ...`).

### Antes de empezar

- Comprobar la versión con `gentle-ai --version` y ejecutar `gentle-ai sync` tras actualizar. Las notas de la v3.0.0 indican que en Windows algunas vías de instalación se quedan en la v2.9.1: si es el caso, ODD y RDD siguen disponibles, pero conviene confirmarlo antes del primer hito.
- La app es solo para Windows: la verificación real (sección 2 de `AGENTS.md`) necesita una máquina o VM Windows con WebView2.

---

## 9. Fuera de alcance en v1

- Hacer capturas propias (región, ventana, scroll) o sustituir al Recortes.
- Sincronización en la nube, cuentas, compartir por enlace.
- OCR, IA o cualquier acceso a red.
- macOS y Linux.
- Firma de código y actualizaciones automáticas.

## 10. Decisiones abiertas

Valores por defecto tomados para no bloquear; se pueden cambiar:

- Nombre definitivo e icono (de momento "Pinza").
- Multi-monitor: la línea aparece en el monitor principal; mover al monitor del cursor queda para después.
- Repositorio público o privado y licencia (si es público, MIT).
