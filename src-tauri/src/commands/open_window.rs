use crate::windows_mgr::{self, WindowKind};

/// Abre (o trae al frente) una de las ventanas que no viven siempre.
///
/// Debe ser `async`: Tauri ejecuta los comandos síncronos en el hilo principal
/// y `build` bloquea ese hilo hasta que la webview responde, con lo que la
/// invocación se queda esperando a un hilo bloqueado por ella misma.
///
/// <https://v2.tauri.app/develop/calling-rust/#async-commands>
#[tauri::command]
pub async fn open_window(app: tauri::AppHandle, label: WindowKind) -> Result<(), String> {
    windows_mgr::open(&app, label).map_err(|error| error.to_string())
}
