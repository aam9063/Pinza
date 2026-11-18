//! Comandos expuestos a la web, uno por fichero.

pub mod app_info;
pub mod file_ops;
pub mod get_shelf;
pub mod line;
pub mod open_window;
pub mod restart_watching;
pub mod settings_cmds;
pub mod watching;

/// Eventos que el shell emite hacia la web cuando la línea cambia.
pub const SCREENSHOT_ADDED_EVENT: &str = "screenshot:added";
pub const SCREENSHOT_REMOVED_EVENT: &str = "screenshot:removed";
pub const SETTINGS_CHANGED_EVENT: &str = "settings:changed";
pub const LINE_SHOW_EVENT: &str = "line:show";
pub const LINE_HIDE_EVENT: &str = "line:hide";
