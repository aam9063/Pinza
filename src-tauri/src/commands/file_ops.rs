//! Operaciones de fichero sobre una captura colgada (BRIEF §5.3: Rust es la
//! fuente de verdad de las operaciones de archivo y se prueban contra
//! carpetas temporales, nunca contra la carpeta real del usuario).

use std::path::{Path, PathBuf};

use serde::Serialize;

/// Resultado de una operación sobre la captura: qué fichero la recibió.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileOutcome {
    /// Ruta del fichero afectado, para que la web pueda mostrar feedback.
    pub path: PathBuf,
}

fn validate(path: &Path) -> Result<(), String> {
    if !path.is_file() {
        return Err(format!("el fichero no existe o no es un fichero: {path:?}"));
    }
    Ok(())
}

/// Copia la imagen al portapapeles como imagen PNG (se pega con la imagen
/// completa, no como texto).
#[tauri::command]
pub fn copy_image(app: tauri::AppHandle, path: PathBuf) -> Result<FileOutcome, String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    validate(&path)?;
    let bytes = std::fs::read(&path)
        .map_err(|error| format!("no se pudo leer la captura para copiar: {error}"))?;
    let owned = tauri::image::Image::from_bytes(&bytes)
        .map_err(|error| format!("no se pudo decodificar la captura para copiar: {error}"))?
        .to_owned();
    app.clipboard()
        .write_image(&owned)
        .map_err(|error| format!("no se pudo copiar al portapapeles: {error}"))?;
    Ok(FileOutcome { path })
}

/// Abre la captura con el visor predeterminado de Windows.
#[tauri::command]
pub fn open_file(app: tauri::AppHandle, path: PathBuf) -> Result<FileOutcome, String> {
    use tauri_plugin_opener::OpenerExt;

    validate(&path)?;
    app.opener()
        .open_path(path.to_string_lossy(), None::<&str>)
        .map_err(|error| format!("no se pudo abrir con el visor predeterminado: {error}"))?;
    Ok(FileOutcome { path })
}

/// Envía la captura a la Papelera de reciclaje (nunca un borrado definitivo).
#[tauri::command]
pub fn trash_file(path: PathBuf) -> Result<FileOutcome, String> {
    validate(&path)?;
    trash::delete(&path).map_err(|error| format!("no se pudo enviar a la Papelera: {error}"))?;
    Ok(FileOutcome { path })
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
                "pinza-commands-{name}-{}",
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

    fn png_file(dir: &Path, name: &str) -> PathBuf {
        let image = image::ImageBuffer::from_fn(8, 8, |x, y| {
            image::Rgba([(x * 7) as u8, (y * 11) as u8, 90, 255])
        });
        let path = dir.join(name);
        image
            .save_with_format(&path, image::ImageFormat::Png)
            .unwrap();
        path
    }

    #[test]
    fn validation_rejects_missing_files() {
        let guard = TempDirGuard::new("missing");
        let missing = guard.path.join("no-existe.png");
        assert!(validate(&missing).is_err());
    }

    #[test]
    fn validation_accepts_real_files() {
        let guard = TempDirGuard::new("real");
        let file = png_file(&guard.path, "captura.png");
        assert!(validate(&file).is_ok());
    }

    #[test]
    fn validation_rejects_directories() {
        let guard = TempDirGuard::new("dir");
        assert!(validate(&guard.path).is_err());
    }

    #[test]
    fn trashing_a_file_removes_it_and_it_can_be_restored_from_the_recycle_bin() {
        let guard = TempDirGuard::new("trash");
        let file = png_file(&guard.path, "a-la-papelera.png");
        assert!(file.is_file());

        // La Papelera de Windows mueve el fichero fuera de su carpeta; en un
        // directorio temporal el resultado observable es que desaparece y el
        // usuario puede restaurarlo desde la Papelera (nunca es un borrado
        // definitivo: trash::delete usa IFileOperation de Explorer).
        let outcome = trash_file(file.clone()).expect("la captura va a la Papelera");
        assert_eq!(outcome.path, file);
        assert!(!file.exists(), "el fichero salió de la carpeta temporal");
    }

    #[test]
    fn trashing_a_missing_file_fails() {
        let guard = TempDirGuard::new("trash-missing");
        let missing = guard.path.join("no-existe.png");
        assert!(trash_file(missing).is_err());
    }
}
