use tauri::{AppHandle, Manager};

use crate::windows_mgr::LINE_LABEL;

/// Activa y desactiva el click-through de la línea: la ventana ignora el
/// ratón salvo cuando el puntero pasa sobre una miniatura, que es la web la
/// que avisa por este comando (BRIEF §5.4, ventana `line`).
#[tauri::command]
pub fn set_line_interactive(app: AppHandle, interactive: bool) -> Result<(), String> {
    let Some(window) = app.get_webview_window(LINE_LABEL) else {
        return Err(format!("no se encontró la ventana {LINE_LABEL}"));
    };

    window
        .set_ignore_cursor_events(!interactive)
        .map_err(|error| format!("no se pudo cambiar el click-through de la línea: {error}"))
}
