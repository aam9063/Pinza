# Pinza

Cada captura de pantalla nueva, colgada en una línea en el borde superior de Windows.

Pinza es una app de escritorio para **Windows 10/11** que vive en la bandeja del sistema
y en una franja transparente sobre el escritorio. Cuando aparece una captura nueva en tu
carpeta de capturas, la cuelga de la línea con una pinza: desde ahí la copias, la anotas,
la abres, la arrastras a otra aplicación o la tiras a la papelera, sin abrir el Explorador.

- **No sustituye a la herramienta de captura de Windows.** Win + Impr Pant y el Recortes
  siguen funcionando como siempre; Pinza vigila la carpeta y reacciona.
- **Todo local.** Sin cuentas, sin red, sin analítica: la aplicación no hace ni una petición.
- **El original nunca se toca.** Anotar escribe una copia `_anotada.png` junto al original.

Las pantallas de referencia del diseño están en [`docs/design/`](docs/design/) y el detalle
de los flujos, el stack y los hitos en [`BRIEF.md`](BRIEF.md).

## Estado

Hito **M0 (andamiaje)** en curso. La parte web está verde y verificada sobre el export
estático; el shell nativo está escrito pero **todavía no compilado ni ejecutado**, porque la
máquina de desarrollo actual no tiene toolchain de Rust.

| Hito | Contenido                                                                    | Estado    |
| ---- | ---------------------------------------------------------------------------- | --------- |
| M0   | Andamiaje: export estático, comprobaciones estáticas, ventanas, verificación | En curso  |
| M1   | Vigilante de carpeta y línea con animación de colgar y descolgar             | Pendiente |
| M2   | Gestos: copiar, abrir, arrastrar fuera, papelera, mantener pulsado           | Pendiente |
| M3   | Editor de anotaciones completo                                               | Pendiente |
| M4   | Bandeja, ajustes persistentes, autostart, pantalla completa, idiomas         | Pendiente |
| M5   | Asistente de primer arranque                                                 | Pendiente |
| M6   | Instalador NSIS/MSI e icono definitivo                                       | Pendiente |

## Stack

| Capa               | Tecnología                                                                         |
| ------------------ | ---------------------------------------------------------------------------------- |
| Shell nativo       | Tauri 2 + Rust estable                                                             |
| UI                 | Next.js 16.4 (App Router) como exportación estática, React 19, TypeScript estricto |
| Estilos            | Tailwind CSS v4, con los tokens de diseño en el `@theme`                           |
| Animación          | Motion (`motion/react`), siempre `transform` y `opacity`                           |
| Editor             | Konva + react-konva, perfect-freehand                                              |
| Estado de UI       | Zustand (un store por ventana); la verdad vive en Rust                             |
| Iconos             | lucide-react                                                                       |
| Gestor de paquetes | pnpm                                                                               |

Versiones concretas: `package.json` y `pnpm-lock.yaml`.

## Requisitos

- Windows 10/11 con WebView2 (viene con el sistema en Windows 11).
- Node.js 22 o superior y pnpm 11.
- Rust estable con `rustup` (solo para compilar el shell nativo).

## Puesta en marcha

```bash
pnpm install
pnpm dev:debug      # WebView2 con CDP en el 9222 y carpetas temporales propias
```

`pnpm dev:debug` levanta la app con `--remote-debugging-port=9222` y apunta los ajustes y la
carpeta vigilada a directorios temporales: nunca toca tus capturas reales.

## Comandos

| Comando                                   | Qué hace                                                       |
| ----------------------------------------- | -------------------------------------------------------------- |
| `pnpm dev`                                | Solo la web (Next.js en modo desarrollo)                       |
| `pnpm dev:debug`                          | La app completa, con CDP abierto y carpetas temporales         |
| `pnpm verify`                             | `typecheck` + `lint` + `arch` + `test` + `build:web`           |
| `pnpm typecheck`                          | TypeScript en modo estricto, sin emitir                        |
| `pnpm lint`                               | ESLint plano con las restricciones del proyecto                |
| `pnpm arch`                               | dependency-cruiser: fronteras entre carpetas y APIs prohibidas |
| `pnpm test`                               | Vitest + Testing Library                                       |
| `pnpm build:web`                          | Export estático en `out/`                                      |
| `pnpm e2e`                                | Playwright contra la app real por CDP                          |
| `pnpm verify:export`                      | Sirve `out/` y carga las cuatro rutas en un navegador real     |
| `pnpm verify:shot [ventana]`              | Captura una ventana (o las cuatro)                             |
| `pnpm verify:desktop-shot`                | Captura el escritorio completo                                 |
| `pnpm verify:logs [segundos]`             | Consola del WebView2 de cada ventana                           |
| `pnpm verify:network`                     | Falla ante cualquier petición de red                           |
| `pnpm verify:trace <ventana> <escenario>` | Traza de una animación y tareas de más de 16 ms                |
| `pnpm verify:heap [ventana]`              | Foto del heap para vigilar la memoria                          |
| `pnpm verify:ipc`                         | Humo de los comandos tipados                                   |
| `pnpm seed:screenshots`                   | Copia capturas de prueba en la carpeta vigilada temporal       |
| `pnpm verify:native`                      | Comprobaciones que necesitan escritorio interactivo            |

## Estructura

```
src/                 # Next.js: una ruta por ventana
  app/{line,editor,settings,onboarding}/
  shared/{ipc,motion,ui,log}/    # capa única de Tauri, presets, componentes base
src-tauri/src/       # Rust: comandos, ventanas y (más adelante) vigilante y shelf
scripts/verify/      # utilidades de verificación
e2e/                 # Playwright por CDP y capturas de prueba
docs/                # diseño de referencia y mapa de features
odd/tasks/           # documentos de feature del flujo de trabajo
```

La web solo pinta y emite intenciones: todas las llamadas a Tauri pasan por
`src/shared/ipc/`, y ninguna otra carpeta importa `@tauri-apps/*`.

## Cómo se verifica

Nada se da por bueno por leer el código. Cada ventana es un WebView2, así que se opera por
Chrome DevTools Protocol como lo haría una persona: se capturan pantallas, se leen trazas, se
comprueba que no hay peticiones de red y se mide la memoria. El detalle está en
[`AGENTS.md`](AGENTS.md), sección 2.

## Cómo se trabaja

- **ODD** (Organic Driven Development): cada hito se abre como documento de feature en
  `odd/tasks/`, con specs citadas, tareas y evidencias.
- **TDD**: se observa el rojo antes de arreglarlo, en Vitest y en `cargo test`.
- **RDD**: revisión nativa sobre el cambio congelado en cada PR.
- Ramas `main` → `dev` → `feature/<nombre>`; las PR van contra `dev`.

## Idioma

La documentación, los mensajes de commit y los textos de la interfaz están en castellano de
España; el código (identificadores, tipos, nombres de fichero) en inglés.

## Licencia

Pendiente de decisión. Si el repositorio es público, será MIT. El nombre y el icono de
[Tendedero](https://github.com/alejandrobujan/tendedero), la app de macOS que inspira este
proyecto, quedan fuera de esa licencia: Pinza tiene identidad propia y no reutiliza su código.
