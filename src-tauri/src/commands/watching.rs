use crate::watcher::WatchControl;

/// Deja de colgar capturas nuevas; la línea se mantiene tal cual.
#[tauri::command]
pub fn pause_watching(watching: tauri::State<'_, WatchControl>) -> Result<(), String> {
    watching.pause()
}

/// Vuelve a colgar capturas nuevas en la línea.
#[tauri::command]
pub fn resume_watching(watching: tauri::State<'_, WatchControl>) -> Result<(), String> {
    watching.resume()
}
