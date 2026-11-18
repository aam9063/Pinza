//! Ajustes persistentes de Pinza (BRIEF §3, flujo 5). Rust es la fuente de
//! verdad: el JSON vive en la carpeta de datos y la web lee y propone
//! cambios por comandos tipados; un evento `settings:changed` avisa.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Modo de despliegue de la línea (BRIEF flujo 5).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RevealMode {
    Edge,
    Shortcut,
    Both,
}

/// Ajustes de Pinza. Los campos nuevos necesitan default para leer JSONs
/// antiguos sin romper la carga.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// Carpeta vigilada (vacía: la conocida de Windows).
    pub watch_dir: String,
    /// Papelera de reciclaje (true) o borrado definitivo (false).
    pub use_recycle_bin: bool,
    /// Modo de despliegue de la línea.
    pub reveal_mode: RevealMode,
    /// Tope de miniaturas colgadas.
    pub max_thumbnails: usize,
    /// Ocultar la línea cuando hay una app a pantalla completa.
    pub hide_on_fullscreen: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            watch_dir: String::new(),
            use_recycle_bin: true,
            reveal_mode: RevealMode::Both,
            max_thumbnails: 10,
            hide_on_fullscreen: true,
        }
    }
}

/// Ruta del fichero de ajustes dentro de la carpeta de datos.
pub fn settings_path(data_dir: &Path) -> PathBuf {
    data_dir.join("settings.json")
}

/// Carga los ajustes; si el fichero no existe o está corrupto, defaults.
pub fn load(data_dir: &Path) -> Settings {
    let path = settings_path(data_dir);
    let Ok(text) = std::fs::read_to_string(&path) else {
        return Settings::default();
    };
    serde_json::from_str(&text).unwrap_or_default()
}

/// Guarda los ajustes de forma atómica (temporal + renombrar).
pub fn save(data_dir: &Path, settings: &Settings) -> Result<(), String> {
    std::fs::create_dir_all(data_dir)
        .map_err(|error| format!("no se pudo crear la carpeta de datos: {error}"))?;
    let path = settings_path(data_dir);
    let temp = path.with_extension("json.tmp");
    let text = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("no se pudieron serializar los ajustes: {error}"))?;
    std::fs::write(&temp, text)
        .map_err(|error| format!("no se pudo escribir el temporal: {error}"))?;
    std::fs::rename(&temp, &path)
        .map_err(|error| format!("no se pudo confirmar el guardado: {error}"))?;
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
                "pinza-settings-{name}-{}",
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
    fn defaults_match_the_brief() {
        let settings = Settings::default();
        assert_eq!(settings.max_thumbnails, 10);
        assert!(settings.use_recycle_bin);
        assert_eq!(settings.reveal_mode, RevealMode::Both);
        assert!(settings.hide_on_fullscreen);
        assert!(settings.watch_dir.is_empty());
    }

    #[test]
    fn loading_without_a_file_gives_defaults() {
        let guard = TempDirGuard::new("missing");
        assert_eq!(load(&guard.path), Settings::default());
    }

    #[test]
    fn a_corrupt_file_falls_back_to_defaults() {
        let guard = TempDirGuard::new("corrupt");
        std::fs::write(settings_path(&guard.path), "esto no es json").unwrap();
        assert_eq!(load(&guard.path), Settings::default());
    }

    #[test]
    fn a_saved_roundtrip_keeps_every_field() {
        let guard = TempDirGuard::new("roundtrip");
        let settings = Settings {
            watch_dir: "C:\\capturas".to_string(),
            use_recycle_bin: false,
            reveal_mode: RevealMode::Edge,
            max_thumbnails: 5,
            hide_on_fullscreen: false,
        };
        save(&guard.path, &settings).expect("los ajustes se guardan");
        assert_eq!(load(&guard.path), settings);
    }

    #[test]
    fn unknown_fields_do_not_break_loading() {
        let guard = TempDirGuard::new("forward");
        std::fs::write(
            settings_path(&guard.path),
            r#"{"maxThumbnails":7,"campoDelFuturo":true}"#,
        )
        .unwrap();
        let settings = load(&guard.path);
        assert_eq!(settings.max_thumbnails, 7);
        assert_eq!(settings.use_recycle_bin, true);
    }
}
