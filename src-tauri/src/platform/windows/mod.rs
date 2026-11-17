//! Llamadas directas a Win32: carpetas conocidas, posición del cursor y avisos
//! de pantalla completa.
//!
//! Es el único módulo con permiso para usar `unsafe`, y cada bloque lleva su
//! comentario `// SAFETY:` explicando la invariante que asume.

#![allow(unsafe_code)]

use std::path::PathBuf;

/// Punto físico en coordenadas de pantalla.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CursorPoint {
    pub x: i32,
    pub y: i32,
}

/// Posición actual del cursor en coordenadas físicas de pantalla. Devuelve
/// `Err` con el motivo en lugar de degradar el estado a una suposición.
#[cfg(windows)]
pub fn cursor_position() -> Result<CursorPoint, String> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    let mut point = POINT::default();
    // SAFETY: GetCursorPos solo escribe sobre el POINT del llamante y no
    // guarda estado; no hay invariante adicional.
    // <https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-getcursorpos>
    let result = unsafe { GetCursorPos(&mut point) };
    result
        .map_err(|error| format!("no se pudo leer la posición del cursor: {error}"))
        .map(|_| CursorPoint {
            x: point.x,
            y: point.y,
        })
}

#[cfg(not(windows))]
pub fn cursor_position() -> Result<CursorPoint, String> {
    Err("Pinza solo lee el cursor en Windows".to_string())
}

/// `true` si la ventana en primer plano cubre todo el monitor primario
/// (juego, vídeo o presentación a pantalla completa). Un fallo de la API
/// se registra y se devuelve `false` solo con el motivo en el log: si el
/// monitor no se puede consultar, la línea no debe aparecer a ciegas.
#[cfg(windows)]
pub fn fullscreen_app_active() -> bool {
    use windows::Win32::Foundation::RECT;
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTOPRIMARY,
    };
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowRect};

    // SAFETY: las tres funciones solo consultan estado del sistema; los
    // handles devueltos no requieren liberación y los RECT son del llamante.
    // <https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-getforegroundwindow>
    let foreground = unsafe { GetForegroundWindow() };
    if foreground.is_invalid() {
        log::warn!("no hay ventana en primer plano consultable: se asume sin pantalla completa");
        return false;
    }

    let mut window_rect = RECT::default();
    // SAFETY: GetWindowRect escribe sobre el RECT del llamante con un handle
    // de ventana válido; no hay invariante adicional.
    // <https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-getwindowrect>
    if let Err(error) = unsafe { GetWindowRect(foreground, &mut window_rect) } {
        log::warn!(
            "no se pudo medir la ventana en primer plano: {error}; se asume sin pantalla completa"
        );
        return false;
    }
    let monitor = unsafe { MonitorFromWindow(foreground, MONITOR_DEFAULTTOPRIMARY) };
    if monitor.is_invalid() {
        log::warn!("no se pudo resolver el monitor de la ventana en primer plano: se asume sin pantalla completa");
        return false;
    }
    if monitor.is_invalid() {
        return false;
    }
    // SAFETY: GetMonitorInfoW escribe sobre la estructura del llamante; el
    // campo cbSize debe estar inicializado antes de la llamada.
    // <https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-getmonitorinfo>
    let mut info = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    if !unsafe { GetMonitorInfoW(monitor, &mut info) }.as_bool() {
        log::warn!("no se pudo leer el monitor primario: se asume sin pantalla completa");
        return false;
    }
    let m = info.rcMonitor;
    window_rect.left <= m.left
        && window_rect.top <= m.top
        && window_rect.right >= m.right
        && window_rect.bottom >= m.bottom
}

#[cfg(not(windows))]
pub fn fullscreen_app_active() -> bool {
    false
}

/// Carpeta que Pinza vigila: el valor de `PINZA_WATCH_DIR` si lo trae el
/// entorno, y si no, la carpeta conocida de capturas de pantalla de Windows.
pub fn resolve_watch_folder(env_override: Option<&str>) -> Result<PathBuf, String> {
    if let Some(value) = env_override {
        let value = value.trim();
        if !value.is_empty() {
            return Ok(PathBuf::from(value));
        }
    }
    known_screenshots_folder()
}

/// Carpeta conocida de capturas de pantalla de Windows (FOLDERID_Screenshots).
#[cfg(windows)]
pub fn known_screenshots_folder() -> Result<PathBuf, String> {
    use windows::Win32::System::Com::CoTaskMemFree;
    use windows::Win32::UI::Shell::{
        FOLDERID_Screenshots, SHGetKnownFolderPath, KF_FLAG_CREATE, KNOWN_FOLDER_FLAG,
    };

    // SAFETY: SHGetKnownFolderPath solo exige un identificador de carpeta
    // conocido y no guarda estado entre llamadas. Devuelve una cadena UTF-16
    // asignada con CoTaskMemAlloc que pasa a ser propiedad del llamante:
    // se libera con CoTaskMemFree antes de salir de la función.
    // <https://learn.microsoft.com/windows/win32/api/shlobj_core/nf-shlobj_core-shgetknownfolderpath>
    let folder = unsafe {
        SHGetKnownFolderPath(
            &FOLDERID_Screenshots,
            KNOWN_FOLDER_FLAG(KF_FLAG_CREATE.0),
            None,
        )
    }
    .map_err(|error| format!("no se pudo resolver la carpeta de capturas de Windows: {error}"))?;

    let folder_text = unsafe { folder.to_string() }.map_err(|error| {
        format!("la carpeta de capturas de Windows no es UTF-16 válida: {error}")
    })?;
    // SAFETY: `folder` es el puntero devuelto por SHGetKnownFolderPath, que
    // se asignó con CoTaskMemAlloc y aún no se ha liberado.
    unsafe { CoTaskMemFree(Some(folder.as_ptr().cast())) };

    Ok(PathBuf::from(folder_text))
}

#[cfg(not(windows))]
pub fn known_screenshots_folder() -> Result<PathBuf, String> {
    Err("Pinza solo vigila carpetas de capturas en Windows".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_env_override_wins() {
        let folder = resolve_watch_folder(Some("C:\\capturas-de-prueba"))
            .expect("la variable de entorno define la carpeta");
        assert_eq!(folder, PathBuf::from("C:\\capturas-de-prueba"));
    }

    #[test]
    fn an_empty_env_override_falls_back_to_the_known_folder() {
        let folder =
            resolve_watch_folder(Some("   ")).expect("un valor vacío cae a la carpeta conocida");
        let _ = folder;
    }

    #[cfg(windows)]
    #[test]
    fn the_known_screenshots_folder_exists() {
        let folder = known_screenshots_folder().expect("Windows da la carpeta de capturas");
        assert!(
            folder.is_dir(),
            "la carpeta conocida existe (o se creó con KF_FLAG_CREATE): {folder:?}"
        );
    }
}
