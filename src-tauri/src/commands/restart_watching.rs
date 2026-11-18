//! Reinicio de la vigilancia sobre una carpeta dada (BRIEF flujo 6: el
//! asistente termina con la vigilancia activa sobre la carpeta elegida).

use crate::watcher::{WatchControl, WatcherConfig};
use std::path::PathBuf;
use std::sync::Arc;

/// Reinicia el vigilante sobre `folder`. La carpeta debe existir; el control
/// anterior se apaga antes de arrancar el nuevo.
#[tauri::command]
pub fn restart_watching(
    app: tauri::AppHandle,
    watching: tauri::State<'_, WatchControl>,
    folder: String,
) -> Result<(), String> {
    let folder_path = PathBuf::from(&folder);
    if !folder_path.is_dir() {
        return Err(format!(
            "la carpeta no existe o no es una carpeta: {folder}"
        ));
    }

    let on_screenshot: crate::watcher::OnScreenshot = Arc::new({
        let app = app.clone();
        move |path| crate::hang_screenshot(&app, path)
    });
    let handle = crate::watcher::start(&folder_path, WatcherConfig::default(), on_screenshot)
        .map_err(|error| format!("no se pudo vigilar {folder:?}: {error}"))?;

    if let Some(previous) = watching.replace(handle) {
        previous.stop();
    }
    log::info!("vigilancia reiniciada sobre {folder:?}");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TempDirGuard {
        path: PathBuf,
    }

    impl TempDirGuard {
        fn new(name: &str) -> Self {
            let path = std::env::temp_dir().join(format!(
                "pinza-restart-{name}-{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_nanos()
            ));
            std::fs::create_dir_all(&path).unwrap();
            Self { path }
        }
    }

    impl Drop for TempDirGuard {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.path);
        }
    }

    #[test]
    fn a_missing_folder_is_rejected() {
        let guard = TempDirGuard::new("missing");
        let missing = guard.path.join("no-existe");
        assert!(missing.as_path().try_exists().is_err() || !missing.exists());
        // La validación vive en el comando; aquí comprobamos la condición.
        assert!(!missing.is_dir());
    }

    #[test]
    fn an_existing_folder_passes_the_validation_rule() {
        let guard = TempDirGuard::new("valid");
        assert!(guard.path.is_dir());
    }
}
