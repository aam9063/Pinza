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

/// Manda la captura a la Papelera de reciclaje o la borra definitivamente
/// según el ajuste, y la descolga de la línea para que la miniatura no quede
/// ahí apuntando a un fichero que ya no existe (sus botones dejaban de
/// responder en silencio).
#[tauri::command]
pub fn trash_file(
    app: tauri::AppHandle,
    state: tauri::State<'_, std::sync::Mutex<crate::shelf::Shelf>>,
    settings: tauri::State<'_, std::sync::Mutex<crate::settings::Settings>>,
    path: PathBuf,
) -> Result<FileOutcome, String> {
    use tauri::Emitter;

    validate(&path)?;
    let use_recycle_bin = settings
        .lock()
        .map(|settings| settings.use_recycle_bin)
        .map_err(|_| "los ajustes están envenenados".to_string())?;

    remove_with_mode(&path, use_recycle_bin)?;

    // Descolgar la miniatura: el fichero ya no está.
    let removed = state
        .lock()
        .map_err(|_| "la línea está envenenada".to_string())?
        .unhang_by_path(&path);
    if let Some(entry) = removed {
        if let Err(error) = app.emit(crate::commands::SCREENSHOT_REMOVED_EVENT, &entry) {
            log::error!("no se pudo avisar de la captura descolgada: {error}");
        }
    }

    Ok(FileOutcome { path })
}

/// Borra el fichero según el ajuste: Papelera de reciclaje o definitivo.
fn remove_with_mode(path: &Path, use_recycle_bin: bool) -> Result<(), String> {
    if use_recycle_bin {
        trash::delete(path).map_err(|error| format!("no se pudo enviar a la Papelera: {error}"))
    } else {
        std::fs::remove_file(path)
            .map_err(|error| format!("no se pudo borrar definitivamente: {error}"))
    }
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
        remove_with_mode(&file, true).expect("la captura va a la Papelera");
        assert!(!file.exists(), "el fichero salió de la carpeta temporal");
    }

    #[test]
    fn trashing_a_missing_file_fails() {
        let guard = TempDirGuard::new("trash-missing");
        let missing = guard.path.join("no-existe.png");
        assert!(validate(&missing).is_err());
    }
}

/// Escribe la captura anotada junto al original con el nombre
/// `captura_<fecha>_<hora>_anotada.png` y devuelve su ruta. El original
/// nunca se modifica (BRIEF flujo 4, paso 3).
#[tauri::command]
pub fn save_annotated(original: PathBuf, annotated_png: Vec<u8>) -> Result<FileOutcome, String> {
    use std::time::{SystemTime, UNIX_EPOCH};

    validate(&original)?;
    if annotated_png.is_empty() {
        return Err("el PNG anotado llegó vacío".to_string());
    }
    let Some(folder) = original.parent() else {
        return Err(format!(
            "la captura original no tiene carpeta: {original:?}"
        ));
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("el reloj del sistema no es consistente: {error}"))?;
    let seconds = now.as_secs();
    let stamp = format!(
        "{}-{:02}-{:02}_{:02}-{:02}-{:02}",
        1970 + seconds / 31_536_000,
        (seconds / 2_592_000) % 12 + 1,
        (seconds / 86_400) % 30 + 1,
        (seconds / 3_600) % 24,
        (seconds / 60) % 60,
        seconds % 60
    );
    let stem = original
        .file_stem()
        .map(|stem| stem.to_string_lossy().to_string())
        .unwrap_or_else(|| "captura".to_string());
    let target = folder.join(format!("{stem}_{stamp}_anotada.png"));

    // La decodificación valida que los bytes sean un PNG real antes de escribir.
    let decoded = image::load_from_memory(&annotated_png)
        .map_err(|error| format!("los bytes anotados no son un PNG válido: {error}"))?;
    decoded
        .save_with_format(&target, image::ImageFormat::Png)
        .map_err(|error| format!("no se pudo escribir la anotada: {error}"))?;
    Ok(FileOutcome { path: target })
}

#[cfg(test)]
mod annotated_tests {
    use super::*;

    struct TempDirGuard {
        path: PathBuf,
    }

    impl TempDirGuard {
        fn new(name: &str) -> Self {
            let path = std::env::temp_dir().join(format!(
                "pinza-annotated-{name}-{}",
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

    fn png_bytes(width: u32, height: u32) -> Vec<u8> {
        let mut buffer = std::io::Cursor::new(Vec::new());
        image::ImageBuffer::from_fn(width, height, |x, y| {
            image::Rgba([(x * 3) as u8, (y * 5) as u8, 200, 255])
        })
        .write_to(&mut buffer, image::ImageFormat::Png)
        .unwrap();
        buffer.into_inner()
    }

    fn write_original(dir: &Path, name: &str) -> PathBuf {
        let path = dir.join(name);
        std::fs::write(&path, png_bytes(64, 48)).unwrap();
        path
    }

    #[test]
    fn writes_the_annotated_copy_next_to_the_original_without_touching_it() {
        let guard = TempDirGuard::new("basic");
        let original = write_original(&guard.path, "Captura de pantalla 1.png");
        let hash_before = {
            let bytes = std::fs::read(&original).unwrap();
            format!("{:x}", md5_of(&bytes))
        };

        let outcome =
            save_annotated(original.clone(), png_bytes(64, 48)).expect("la anotada se escribe");

        assert!(outcome.path.is_file());
        assert!(outcome.path.starts_with(&guard.path));
        let name = outcome
            .path
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string();
        assert!(name.ends_with("_anotada.png"), "nombre: {name}");
        assert!(name.contains("Captura de pantalla 1"));
        let hash_after = {
            let bytes = std::fs::read(&original).unwrap();
            format!("{:x}", md5_of(&bytes))
        };
        assert_eq!(hash_before, hash_after, "el original no cambia");
    }

    #[test]
    fn rejects_empty_png_and_missing_original() {
        let guard = TempDirGuard::new("invalid");
        let original = write_original(&guard.path, "a.png");
        assert!(save_annotated(original.clone(), Vec::new()).is_err());
        assert!(save_annotated(guard.path.join("no-existe.png"), png_bytes(10, 10)).is_err());
    }

    #[test]
    fn rejects_bytes_that_are_not_a_png() {
        let guard = TempDirGuard::new("fake");
        let original = write_original(&guard.path, "a.png");
        assert!(save_annotated(original, b"esto no es un png".to_vec()).is_err());
    }

    // FNV-1a: suficiente para comparar bytes en pruebas sin dependencias.
    fn md5_of(bytes: &[u8]) -> u64 {
        let mut hash: u64 = 0xcbf29ce484222325;
        for byte in bytes {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash
    }
}
