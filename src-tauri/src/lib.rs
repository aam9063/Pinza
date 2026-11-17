#![deny(unsafe_code)]
#![cfg_attr(not(test), deny(clippy::unwrap_used, clippy::expect_used))]

//! Shell nativo de Pinza.
//!
//! Rust es la fuente de verdad: la lista de capturas colgadas, los ajustes y
//! las operaciones de fichero viven aquí. La web solo pinta y emite
//! intenciones a través de los comandos expuestos en `commands`.

mod commands;
mod platform;
mod shelf;
mod thumbnails;
mod watcher;
mod windows_mgr;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use shelf::{HangOutcome, Shelf, ShelfEntry};
use tauri::{AppHandle, Emitter, Manager};
use watcher::{OnScreenshot, WatchControl, WatcherConfig};

const WATCH_DIR_ENV: &str = "PINZA_WATCH_DIR";

pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(Mutex::new(Shelf::default()))
        .manage(WatchControl::default())
        .invoke_handler(tauri::generate_handler![
            commands::app_info::app_info,
            commands::open_window::open_window,
            commands::get_shelf::get_shelf,
            commands::watching::pause_watching,
            commands::watching::resume_watching,
        ])
        .setup(|app| {
            windows_mgr::attach_line_to_primary_monitor(app.handle())?;
            setup_watcher(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(error) = result {
        log::error!("el shell de Pinza no pudo arrancar: {error}");
        std::process::exit(1);
    }
}

/// Arranca la vigilancia sin impedir que la app abra: la bandeja y las
/// ventanas siguen sirviendo aunque la carpeta de capturas no se resuelva.
fn setup_watcher(app: &AppHandle) {
    if let Err(error) = start_watching(app) {
        log::error!("la vigilancia no arrancó: {error}");
    }
}

/// Resuelve la carpeta vigilada y deja el vigilante corriendo. Si algo falla,
/// la app arranca igual: sin línea nueva hasta que se reanude la vigilancia.
fn start_watching(app: &AppHandle) -> Result<(), String> {
    let folder =
        platform::windows::resolve_watch_folder(std::env::var(WATCH_DIR_ENV).ok().as_deref())?;

    let on_screenshot: OnScreenshot = Arc::new({
        let app = app.clone();
        move |path| hang_screenshot(&app, path)
    });

    let handle = watcher::start(&folder, WatcherConfig::default(), on_screenshot)
        .map_err(|error| format!("no se pudo vigilar {folder:?}: {error}"))?;

    if let Some(previous) = app.state::<WatchControl>().replace(handle) {
        previous.stop();
    }

    log::info!("vigilando capturas en {folder:?}");
    Ok(())
}

/// Cuelga una captura en la línea y emite los eventos de alta y de baja que
/// correspondan (baja si el tope descolgó la más antigua).
fn hang_screenshot(app: &AppHandle, path: PathBuf) {
    let entry = ShelfEntry::from_path(&path);

    let outcome = match app.state::<Mutex<Shelf>>().lock() {
        Ok(mut shelf) => shelf.hang(entry.clone()),
        Err(poisoned) => {
            log::warn!("la línea estaba envenenada; se recupera el estado y se cuelga {path:?}");
            poisoned.into_inner().hang(entry.clone())
        }
    };

    let HangOutcome::Hung { evicted } = outcome else {
        log::debug!("la captura {path:?} ya estaba colgada");
        return;
    };

    if let Err(error) = app.emit(commands::SCREENSHOT_ADDED_EVENT, entry) {
        log::error!("no se pudo avisar de la nueva captura: {error}");
    }
    if let Some(evicted) = evicted {
        if let Err(error) = app.emit(commands::SCREENSHOT_REMOVED_EVENT, &evicted) {
            log::error!("no se pudo avisar de la captura descolgada: {error}");
        }
        log::info!(
            "el tope descolgó {} (su fichero no se toca)",
            evicted.file_name()
        );
    }
}
