#![deny(unsafe_code)]
#![cfg_attr(not(test), deny(clippy::unwrap_used, clippy::expect_used))]

//! Shell nativo de Pinza.
//!
//! Rust es la fuente de verdad: la lista de capturas colgadas, los ajustes y
//! las operaciones de fichero viven aquí. La web solo pinta y emite
//! intenciones a través de los comandos expuestos en `commands`.

mod commands;
mod platform;
mod windows_mgr;

pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::app_info::app_info,
            commands::open_window::open_window,
        ])
        .setup(|app| {
            windows_mgr::attach_line_to_primary_monitor(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(error) = result {
        log::error!("el shell de Pinza no pudo arrancar: {error}");
        std::process::exit(1);
    }
}
