//! Lectura y escritura de los ajustes persistentes (BRIEF flujo 5). Rust es
//! la fuente de verdad: el JSON vive en la carpeta de datos y cada cambio
//! emite `settings:changed` a las ventanas.

use serde::Serialize;
use tauri::Manager;

use crate::settings::{self, Settings};

/// Ajustes actuales de Pinza.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsPayload {
    /// Carpeta de datos donde vive el JSON (para diagnóstico).
    pub data_dir: String,
    #[serde(flatten)]
    pub settings: Settings,
}

fn data_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    super::super::resolve_data_dir(app)
}

/// Devuelve los ajustes actuales.
#[tauri::command]
pub fn get_settings(
    app: tauri::AppHandle,
    state: tauri::State<'_, std::sync::Mutex<Settings>>,
) -> Result<SettingsPayload, String> {
    let settings = state
        .lock()
        .map_err(|_| "los ajustes están envenenados".to_string())?
        .clone();
    Ok(SettingsPayload {
        data_dir: data_dir(&app)?.to_string_lossy().to_string(),
        settings,
    })
}

/// Aplica y persiste los ajustes nuevos, y emite `settings:changed`.
#[tauri::command]
pub fn set_settings(
    app: tauri::AppHandle,
    state: tauri::State<'_, std::sync::Mutex<Settings>>,
    settings: Settings,
) -> Result<(), String> {
    let dir = data_dir(&app)?;
    settings::save(&dir, &settings)?;
    let (previous_limit, previous_shortcut) = state
        .lock()
        .map(|current| (current.max_thumbnails, current.shortcut.clone()))
        .map_err(|_| "los ajustes están envenenados".to_string())?;
    let shortcut_changed = settings.shortcut != previous_shortcut;
    let previous_autostart = state
        .lock()
        .map(|current| current.start_with_windows)
        .map_err(|_| "los ajustes están envenenados".to_string())?;
    *state
        .lock()
        .map_err(|_| "los ajustes están envenenados".to_string())? = settings.clone();

    if settings.start_with_windows != previous_autostart {
        apply_autostart_flag(&app, settings.start_with_windows);
    }

    // El tope nuevo re-aplica la cola al vuelo: las descolgadas emiten su
    // evento y sus ficheros nunca se borran (BRIEF flujo 3).
    if settings.max_thumbnails != previous_limit {
        use crate::shelf::{Shelf, ShelfEntry};
        use tauri::Manager;
        let evicted: Vec<ShelfEntry> = app
            .state::<std::sync::Mutex<Shelf>>()
            .lock()
            .map(|mut shelf| shelf.set_max_entries(settings.max_thumbnails))
            .map_err(|_| "la cola de la línea está envenenada: el tope no se aplicó".to_string())?;
        for entry in evicted {
            if let Err(error) = app.emit(crate::commands::SCREENSHOT_REMOVED_EVENT, &entry) {
                log::error!("no se pudo avisar de la captura descolgada: {error}");
            }
            log::info!(
                "el nuevo tope descolgó {} (su fichero no se toca)",
                entry.file_name()
            );
        }
    }

    // El atajo nuevo se registra al vuelo (BRIEF flujo 5).
    if shortcut_changed {
        if let Err(error) = crate::register_reveal_shortcut(&app, &settings.shortcut) {
            log::error!(
                "el nuevo atajo {} no se pudo registrar: {error}",
                settings.shortcut
            );
        }
    }

    use tauri::Emitter;
    app.emit(super::SETTINGS_CHANGED_EVENT, &settings)
        .map_err(|error| format!("no se pudo avisar del cambio de ajustes: {error}"))?;
    Ok(())
}

/// Carga los ajustes del disco al arrancar (llamado desde `setup`).
pub fn load_into(app: &tauri::AppHandle) -> Result<Settings, String> {
    let dir = data_dir(app)?;
    let loaded = settings::load(&dir);
    *app.state::<std::sync::Mutex<Settings>>()
        .lock()
        .map_err(|_| "los ajustes están envenenados".to_string())? = loaded.clone();
    Ok(loaded)
}

/// Aplica el arranque con Windows al plugin (idempotente).
fn apply_autostart_flag(app: &tauri::AppHandle, enabled: bool) {
    use tauri_plugin_autostart::ManagerExt;

    let autostart = app.autolaunch();
    let result = if enabled {
        autostart.enable()
    } else {
        autostart.disable()
    };
    match result {
        Ok(()) => log::info!(
            "arranque con Windows: {}",
            if enabled { "activado" } else { "desactivado" }
        ),
        Err(error) => log::error!("no se pudo aplicar el arranque con Windows: {error}"),
    }
}

/// Propone la carpeta conocida de capturas de Windows (asistente, flujo 6).
#[tauri::command]
pub fn suggest_watch_folder() -> Result<String, String> {
    crate::platform::windows::known_screenshots_folder()
        .map(|folder| folder.to_string_lossy().to_string())
}
