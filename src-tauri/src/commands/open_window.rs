use tauri::Manager;

use crate::windows_mgr::{self, WindowKind};

/// Abre (o trae al frente) una de las ventanas que no viven siempre.
///
/// Debe ser `async`: Tauri ejecuta los comandos síncronos en el hilo principal
/// y `build` bloquea ese hilo hasta que la webview responde, con lo que la
/// invocación se queda esperando a un hilo bloqueado por ella misma.
///
/// <https://v2.tauri.app/develop/calling-rust/#async-commands>
#[tauri::command]
pub async fn open_window(
    app: tauri::AppHandle,
    label: WindowKind,
    capture_path: Option<String>,
) -> Result<(), String> {
    // El editor siempre abre sobre una captura concreta: el shell la guarda
    // como objetivo (Rust es la fuente de verdad) y la web se la pide.
    if let Some(path) = capture_path {
        let target_path = std::path::PathBuf::from(&path);
        if !target_path.is_file() {
            return Err(format!("la captura a anotar no existe: {path}"));
        }
        // El scope de assets solo cubre las miniaturas: se permite también el
        // fichero concreto que el editor va a abrir, nunca la carpeta entera
        // de capturas (BRIEF §5.3).
        app.asset_protocol_scope()
            .allow_file(&target_path)
            .map_err(|error| {
                format!("no se pudo permitir la captura en el scope de assets: {error}")
            })?;
        app.state::<std::sync::Mutex<EditorTarget>>()
            .lock()
            .map(|mut target| *target = EditorTarget { path: target_path })
            .map_err(|_| "el objetivo del editor está envenenado".to_string())?;
    }
    windows_mgr::open(&app, label).map_err(|error| error.to_string())
}

/// Captura que el editor tiene abierta. La fija `open_window` al pedir la
/// ventana con `capture_path`.
#[derive(Debug, Clone, Default)]
pub struct EditorTarget {
    pub path: std::path::PathBuf,
}

/// Devuelve la captura abierta en el editor, si la hay.
#[tauri::command]
pub fn get_editor_capture(
    target: tauri::State<'_, std::sync::Mutex<EditorTarget>>,
) -> Result<Option<String>, String> {
    let guard = target
        .lock()
        .map_err(|_| "el objetivo del editor está envenenado".to_string())?;
    Ok(guard.path.to_str().map(std::string::ToString::to_string))
}

/// Devuelve los bytes PNG de la captura abierta en el editor. La web los
/// pinta desde un `data:` URL para que el lienzo de exportación no quede
/// tainted (el protocolo de assets no sirve cabeceras CORS).
#[tauri::command]
pub fn get_editor_capture_png(
    target: tauri::State<'_, std::sync::Mutex<EditorTarget>>,
) -> Result<Vec<u8>, String> {
    let guard = target
        .lock()
        .map_err(|_| "el objetivo del editor está envenenado".to_string())?;
    if !guard.path.is_file() {
        return Err(format!("la captura del editor no existe: {:?}", guard.path));
    }
    std::fs::read(&guard.path).map_err(|error| format!("no se pudo leer la captura: {error}"))
}
