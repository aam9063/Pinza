# M6 — Distribución: instalador NSIS

> Última entrega del plan v1 (`BRIEF.md` §7): el bundler de Tauri genera el instalador NSIS con
> el icono propio y la versión, listo para instalar, usar y desinstalar en una máquina limpia.
> La firma de código queda fuera de v1 (SmartScreen avisará). Idioma: castellano, código inglés.

## Specs

**S1 — El instalador (BRIEF §7, M6).**
> Instalador NSIS/MSI con el bundler de Tauri, icono propio, versión. Firma de código queda fuera de v1 (SmartScreen avisará).

**S2 — Criterio de aceptación (BRIEF §7, M6).**
> Instalar, usar y desinstalar en una máquina limpia.

**S3 — Configuración (BRIEF §4).**
> Release build (NSIS/MSI installer from the Tauri bundler). El bundle declara nombre, versión,
> iconos y el idioma del instalador en castellano; el asistente de M5 se dispara en la primera
> ejecución (instalación limpia sin `settings.json`).

**S4 — Reglas del repo (AGENTS §6).**
> La CI debe seguir verde con el bundle activado; los artefactos de build no se commitean.

## Fuera de alcance

- Firma de código y certificado: fuera de v1 por decisión del BRIEF.
- Actualizaciones automáticas: fuera de v1.

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | `tauri.conf.json`: metadatos del bundle (productName, version, publisher, idioma NSIS es-es), verificación del icono propio | S1, S3 |
| T2 | Compilar el instalador en local (`pnpm tauri build`), verificar artefactos NSIS generados con nombre y versión correctos | S1 |
| T3 | Documentar la verificación en máquina limpia (instalar → usar → desinstalar) en el doc ODD; el propio Albert la ejecuta con el instalador generado | S2 |

## Log

**L1:** «merge listo» → M5 mergeado (PR #11, `dd3ea5f`); luz verde a M6, la última entrega. Rama `feature/m6-installer` desde `origin/dev`.

**L2:** T1-T2 completas. El bundle queda configurado con nombre, versión 0.1.0, publisher, descripciones en castellano, NSIS en español con `installMode: currentUser` (sin pedir privilegios de administrador) y targets solo NSIS (MSI queda fuera de v1: NSIS cubre el flujo del BRIEF). El build release generó el instalador: `src-tauri/target/release/bundle/nsis/Pinata...` → `Pinza_0.1.0_x64-setup.exe` (4,27 MiB), con el icono propio y el asistente de M5 disparándose en la primera ejecución por la instalación limpia (sin `settings.json`).

**Verificación en máquina limpia (T3, la ejecuta Albert):**
1. Copiar `Pinza_0.1.0_x64-setup.exe` a una máquina (o VM) Windows 10/11 limpia.
2. Instalar (SmartScreen avisará: fuera de v1 la firma de código; «Más información» → «Ejecutar igualmente»).
3. Usar: el asistente de 3 pasos arranca solo; terminar → hacer una captura (Win+Impr Pant) → la miniatura cuelga en la línea; probar el atajo, copiar, anotar, papelera.
4. Desinstalar desde Configuración > Aplicaciones; comprobar que la línea desaparece y los procesos mueren.

Pendiente: push, revisión RDD y PR.
