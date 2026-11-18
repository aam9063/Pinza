//! Icono de la bandeja con su menú (BRIEF §3, flujo 5): mostrar u ocultar la
//! línea, abrir la carpeta de capturas, pausar o reanudar la vigilancia,
//! ajustes y salir.

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Manager,
};

use crate::i18n::tray_text;
use crate::reveal::RevealControl;
use crate::watcher::WatchControl;
use crate::windows_mgr;

/// Identificador de la bandeja.
pub const TRAY_ID: &str = "pinza-tray";

/// Crea el icono de la bandeja con su menú y deja los handlers cableados.
pub fn create(app: &AppHandle) -> Result<TrayIcon, String> {
    let toggle_line = MenuItem::with_id(
        app,
        "toggle-line",
        "Mostrar u ocultar la línea",
        true,
        None::<&str>,
    )
    .map_err(|error| format!("no se pudo crear el menú: {error}"))?;
    let open_folder = MenuItem::with_id(
        app,
        "open-folder",
        "Abrir carpeta de capturas",
        true,
        None::<&str>,
    )
    .map_err(|error| format!("no se pudo crear el menú: {error}"))?;
    let pause = MenuItem::with_id(
        app,
        "pause-watching",
        "Pausar la vigilancia",
        true,
        None::<&str>,
    )
    .map_err(|error| format!("no se pudo crear el menú: {error}"))?;
    let settings_item = MenuItem::with_id(
        app,
        "open-settings",
        tray_text("open-settings"),
        true,
        None::<&str>,
    )
    .map_err(|error| format!("no se pudo crear el menú: {error}"))?;
    let quit = PredefinedMenuItem::quit(app, Some(tray_text("quit")))
        .map_err(|error| format!("no se pudo crear el menú: {error}"))?;

    let menu = Menu::with_items(
        app,
        &[&toggle_line, &open_folder, &pause, &settings_item, &quit],
    )
    .map_err(|error| format!("no se pudo crear el menú: {error}"))?;

    let icon = app
        .default_window_icon()
        .ok_or_else(|| "no hay icono de la app para la bandeja".to_string())?
        .clone();

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .tooltip("Pinza")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()))
        .build(app)
        .map_err(|error| format!("no se pudo crear la bandeja: {error}"))
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        "toggle-line" => app.state::<RevealControl>().request_toggle(),
        "open-folder" => open_watch_folder(app),
        "pause-watching" => toggle_watching(app),
        "open-settings" => open_settings(app),
        _ => {}
    }
}

fn open_watch_folder(app: &AppHandle) {
    let settings = app
        .state::<std::sync::Mutex<crate::settings::Settings>>()
        .lock()
        .map(|settings| settings.watch_dir.clone())
        .unwrap_or_default();
    let folder = if settings.trim().is_empty() {
        match crate::platform::windows::known_screenshots_folder() {
            Ok(folder) => folder,
            Err(error) => {
                log::error!("no se pudo resolver la carpeta de capturas: {error}");
                return;
            }
        }
    } else {
        std::path::PathBuf::from(settings)
    };
    if let Err(error) = tauri_plugin_opener::OpenerExt::opener(app)
        .open_path(folder.to_string_lossy(), None::<&str>)
    {
        log::error!("no se pudo abrir la carpeta de capturas: {error}");
    }
}

fn toggle_watching(app: &AppHandle) {
    let watch = app.state::<WatchControl>();
    let result = if watch.is_paused() {
        watch.resume().map(|_| "reanudada")
    } else {
        watch.pause().map(|_| "pausada")
    };
    match result {
        Ok(label) => log::info!("vigilancia {label} desde la bandeja"),
        Err(error) => log::error!("no se pudo cambiar la vigilancia: {error}"),
    }
}

fn open_settings(app: &AppHandle) {
    if let Err(error) = windows_mgr::open(app, windows_mgr::WindowKind::Settings) {
        log::error!("no se pudo abrir ajustes: {error}");
    }
}
