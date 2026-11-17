//! Generación de miniaturas en Rust: nunca se carga el PNG completo en la
//! línea (BRIEF §4). Cada captura colgada produce un PNG reducido guardado en
//! la caché de datos; la web recibe la ruta de la caché, no la del original.

use std::path::{Path, PathBuf};

/// Alto de la miniatura en píxeles: cabe en la franja de la línea
/// (`windows_mgr::LINE_HEIGHT`) con margen para cuerda y pinza.
pub const THUMBNAIL_HEIGHT: u32 = 120;

/// Errores al generar una miniatura.
#[derive(Debug, thiserror::Error)]
pub enum ThumbnailError {
    #[error("no se pudo leer la captura {0:?}")]
    Read(std::io::Error),
    #[error("no se pudo decodificar la captura {1:?}: {0}")]
    Decode(#[source] image::ImageError, PathBuf),
    #[error("no se pudo escribir la miniatura de {1:?}: {0}")]
    Write(std::io::Error, PathBuf),
}

/// Carpeta de caché de miniaturas dentro de la carpeta de datos de Pinza.
pub fn cache_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("thumbnails")
}

/// Ruta de la miniatura de una captura dentro de la caché. La clave incluye
/// la fecha de modificación del original: si la captura cambia, cambia la clave.
pub fn thumbnail_path(cache: &Path, original: &Path) -> PathBuf {
    let stem = original
        .file_stem()
        .unwrap_or_else(|| std::ffi::OsStr::new("captura"))
        .to_string_lossy();
    let stamp = original
        .metadata()
        .and_then(|m| m.modified())
        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
        .unwrap_or(0);
    cache.join(format!("{stem}-{stamp}.png"))
}

/// Genera (o reutiliza) la miniatura de una captura. Devuelve la ruta de la
/// miniatura en la caché; el fichero original nunca se modifica.
pub fn generate(original: &Path, cache: &Path) -> Result<PathBuf, ThumbnailError> {
    let target = thumbnail_path(cache, original);
    if target.is_file() {
        return Ok(target);
    }

    std::fs::create_dir_all(cache).map_err(ThumbnailError::Read)?;
    let decoded = image::open(original)
        .map_err(|error| ThumbnailError::Decode(error, original.to_path_buf()))?;
    let thumb = decoded.thumbnail(THUMBNAIL_HEIGHT * 4, THUMBNAIL_HEIGHT);
    thumb
        .save_with_format(&target, image::ImageFormat::Png)
        .map_err(|error| match error {
            image::ImageError::IoError(io) => ThumbnailError::Write(io, target.clone()),
            other => ThumbnailError::Write(
                std::io::Error::other(other.to_string()),
                target.clone(),
            ),
        })?;
    Ok(target)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgba};

    struct TempDirGuard {
        path: PathBuf,
    }

    impl TempDirGuard {
        fn new(name: &str) -> Self {
            let path = std::env::temp_dir().join(format!(
                "pinza-thumb-{name}-{}",
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

    fn write_png(dir: &Path, name: &str, width: u32, height: u32) -> PathBuf {
        let image = ImageBuffer::from_fn(width, height, |x, y| {
            Rgba([(x % 256) as u8, (y % 256) as u8, 128, 255])
        });
        let path = dir.join(name);
        image.save_with_format(&path, image::ImageFormat::Png).unwrap();
        path
    }

    #[test]
    fn generates_a_thumbnail_inside_the_cache_dir() {
        let guard = TempDirGuard::new("basic");
        let original = write_png(&guard.path, "captura.png", 1920, 1080);
        let cache = cache_dir(&guard.path.join("datos"));

        let thumb = generate(&original, &cache).unwrap();

        assert!(thumb.is_file());
        assert!(thumb.starts_with(&cache));
        let size = image::image_dimensions(&thumb).unwrap();
        assert_eq!(size.1, THUMBNAIL_HEIGHT);
        assert!(size.0 <= THUMBNAIL_HEIGHT * 4);
    }

    #[test]
    fn reuses_the_cached_thumbnail_without_redecoding() {
        let guard = TempDirGuard::new("reuse");
        let original = write_png(&guard.path, "captura.png", 800, 600);
        let cache = cache_dir(&guard.path);

        let first = generate(&original, &cache).unwrap();
        let mtime = std::fs::metadata(&first).unwrap().modified().unwrap();
        std::thread::sleep(std::time::Duration::from_millis(20));
        let second = generate(&original, &cache).unwrap();

        assert_eq!(first, second);
        assert_eq!(
            mtime,
            std::fs::metadata(&second).unwrap().modified().unwrap()
        );
    }

    #[test]
    fn a_changed_original_gets_a_new_cache_key() {
        let guard = TempDirGuard::new("changed");
        let original = write_png(&guard.path, "captura.png", 800, 600);
        let cache = cache_dir(&guard.path);

        let first = generate(&original, &cache).unwrap();
        let newer = guard.path.join("nueva-captura.png");
        std::fs::copy(&original, &newer).unwrap();
        let older_time = std::fs::metadata(&original).unwrap().modified().unwrap();
        let _ = std::fs::metadata(&newer).unwrap().modified().unwrap();
        let _ = older_time;

        let second = generate(&newer, &cache).unwrap();

        assert_ne!(first, second);
    }

    #[test]
    fn a_broken_image_fails_with_decode_error_and_writes_nothing() {
        let guard = TempDirGuard::new("broken");
        let original = guard.path.join("rota.png");
        std::fs::write(&original, b"esto no es un png").unwrap();
        let cache = cache_dir(&guard.path);

        let error = generate(&original, &cache).unwrap_err();

        assert!(matches!(error, ThumbnailError::Decode(_, _)));
        assert!(cache.join("rota-0.png").symlink_metadata().is_err());
    }

    #[test]
    fn an_unwritable_cache_dir_fails_instead_of_panicking() {
        let guard = TempDirGuard::new("unwritable");
        let original = write_png(&guard.path, "captura.png", 200, 200);
        let file = guard.path.join("es-un-fichero");
        std::fs::write(&file, b"ocupa la ruta de la cache").unwrap();

        let error = generate(&original, &file).unwrap_err();

        assert!(matches!(error, ThumbnailError::Read(_)));
    }
}
