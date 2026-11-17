use crate::windows_mgr::{self, WindowKind};

/// Abre (o trae al frente) una de las ventanas que no viven siempre.
#[tauri::command]
pub fn open_window(app: tauri::AppHandle, label: WindowKind) -> Result<(), String> {
    windows_mgr::open(&app, label).map_err(|error| error.to_string())
}
