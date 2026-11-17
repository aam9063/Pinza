#![deny(unsafe_code)]
#![cfg_attr(not(test), deny(clippy::unwrap_used, clippy::expect_used))]

//! Shell nativo de Pinza.
//!
//! Rust es la fuente de verdad: la lista de capturas colgadas, los ajustes y
//! las operaciones de fichero viven aquí. La web solo pinta y emite
//! intenciones a través de los comandos expuestos en `commands`.

mod commands;
mod platform;
mod reveal;
mod shelf;
mod thumbnails;
mod watcher;
mod windows_mgr;

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use commands::LINE_HIDE_EVENT;
use commands::LINE_SHOW_EVENT;
use reveal::{Action, RevealControl, RevealMachine, Tick};
use shelf::{HangOutcome, Shelf, ShelfEntry};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Builder as ShortcutBuilder, GlobalShortcutExt, ShortcutState};
use watcher::{OnScreenshot, WatchControl, WatcherConfig};

const WATCH_DIR_ENV: &str = "PINZA_WATCH_DIR";
const DATA_DIR_ENV: &str = "PINZA_DATA_DIR";

/// Carpeta de datos de Pinza: la que fija `PINZA_DATA_DIR` (verificación y
/// desarrollo) o la estándar de la app. Solo la carpeta de miniaturas se
/// sirve por el protocolo de assets, nunca las capturas originales.
fn resolve_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(data_dir) = std::env::var(DATA_DIR_ENV) {
        if !data_dir.trim().is_empty() {
            return Ok(PathBuf::from(data_dir));
        }
    }
    app.path()
        .app_data_dir()
        .map_err(|error| format!("no se pudo resolver la carpeta de datos: {error}"))
}

pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(ShortcutBuilder::new().build())
        .manage(Mutex::new(Shelf::default()))
        .manage(RevealControl::default())
        .manage(WatchControl::default())
        .invoke_handler(tauri::generate_handler![
            commands::app_info::app_info,
            commands::open_window::open_window,
            commands::get_shelf::get_shelf,
            commands::watching::pause_watching,
            commands::watching::resume_watching,
            commands::line::set_line_interactive,
        ])
        .setup(|app| {
            windows_mgr::attach_line_to_primary_monitor(app.handle())?;
            if let Some(line) = app.get_webview_window(windows_mgr::LINE_LABEL) {
                // La línea nace ignorando el ratón: la web avisa por IPC
                // cuando el puntero pasa sobre una miniatura.
                let _ = line.set_ignore_cursor_events(true);
            }
            app.global_shortcut()
                .on_shortcut("ctrl+alt+t", |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        app.state::<RevealControl>().request_toggle();
                    }
                })
                .map_err(|error| format!("no se pudo registrar el atajo global: {error}"))?;
            serve_thumbnails_scope(app.handle());
            setup_watcher(app.handle());
            spawn_reveal_loop(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(error) = result {
        log::error!("el shell de Pinza no pudo arrancar: {error}");
        std::process::exit(1);
    }
}

const REVEAL_POLL: Duration = Duration::from_millis(50);

/// Sondea el cursor y la pantalla completa y decide si la línea se muestra
/// u oculta. La franja siempre existe como ventana transparente: mostrar y
/// ocultar son solo eventos hacia la web, que anima la cuerda.
fn spawn_reveal_loop(app: AppHandle) {
    std::thread::spawn(move || {
        let mut machine = RevealMachine::new();
        loop {
            std::thread::sleep(REVEAL_POLL);
            let now = Instant::now();
            let cursor = platform::windows::cursor_position().ok();
            let cursor_y = cursor.as_ref().map(|point| point.y);
            let tick = Tick {
                cursor_in_edge_zone: cursor_y.is_some_and(|y| y <= reveal::EDGE_ZONE_PX),
                cursor_in_strip: cursor_y.is_some_and(|y| y <= windows_mgr::LINE_HEIGHT as i32),
                fullscreen: platform::windows::fullscreen_app_active(),
                now,
            };

            let action = if app.state::<RevealControl>().take_toggle() {
                machine.toggle(tick.fullscreen)
            } else {
                machine.tick(tick)
            };

            match action {
                Action::Show => emit_line_event(&app, LINE_SHOW_EVENT, "desplegar"),
                Action::Hide => emit_line_event(&app, LINE_HIDE_EVENT, "ocultar"),
                Action::Nothing => {}
            }
        }
    });
}

fn emit_line_event(app: &AppHandle, event: &str, intent: &str) {
    if let Err(error) = app.emit(event, ()) {
        log::error!("no se pudo avisar de {intent} la línea: {error}");
    }
}

/// Sirve solo la carpeta de miniaturas por el protocolo de assets de Tauri:
/// la web puede pintar miniaturas pero no abrir las capturas originales.
fn serve_thumbnails_scope(app: &AppHandle) {
    let scope = app.asset_protocol_scope();

    let data_dir = match resolve_data_dir(app) {
        Ok(dir) => dir,
        Err(error) => {
            log::error!("{error}");
            return;
        }
    };
    let cache = thumbnails::cache_dir(&data_dir);

    if let Err(error) = std::fs::create_dir_all(&cache) {
        log::error!("no se pudo crear la caché de miniaturas: {error}");
        return;
    }
    if let Err(error) = scope.allow_directory(&cache, true) {
        log::error!("no se pudo permitir la carpeta de miniaturas en el scope: {error}");
        return;
    }

    if !app.manage(Mutex::new(cache.clone())) {
        log::error!("no se pudo registrar la caché de miniaturas");
    }
    log::info!("miniaturas servidas desde {cache:?}");
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

/// Genera la miniatura de una captura usando la caché registrada en el
/// shell. Si falla, la captura se cuelga igual con miniatura vacía.
fn generate_thumbnail(app: &AppHandle, path: &Path) -> PathBuf {
    let Some(cache) = app
        .try_state::<Mutex<PathBuf>>()
        .map(|state| state.lock().map(|dir| dir.clone()).unwrap_or_default())
    else {
        return PathBuf::new();
    };

    match thumbnails::generate(path, &cache) {
        Ok(thumbnail) => thumbnail,
        Err(error) => {
            log::error!("no se pudo generar la miniatura de {path:?}: {error}");
            PathBuf::new()
        }
    }
}

/// Cuelga una captura en la línea y emite los eventos de alta y de baja que
/// correspondan (baja si el tope descolgó la más antigua).
fn hang_screenshot(app: &AppHandle, path: PathBuf) {
    let thumbnail = generate_thumbnail(app, &path);
    let entry = ShelfEntry::from_path(&path).with_thumbnail(thumbnail);

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
