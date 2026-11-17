//! Llamadas directas a Win32: carpetas conocidas, posición del cursor y avisos
//! de pantalla completa.
//!
//! Es el único módulo con permiso para usar `unsafe`, y cada bloque lleva su
//! comentario `// SAFETY:` explicando la invariante que asume.

#![allow(unsafe_code)]

use std::path::PathBuf;

/// Carpeta que Pinza vigila: el valor de `PINZA_WATCH_DIR` si lo trae el
/// entorno, y si no, la carpeta conocida de capturas de pantalla de Windows.
pub fn resolve_watch_folder(env_override: Option<&str>) -> Result<PathBuf, String> {
    if let Some(value) = env_override {
        let value = value.trim();
        if !value.is_empty() {
            return Ok(PathBuf::from(value));
        }
    }
    known_screenshots_folder()
}

/// Carpeta conocida de capturas de pantalla de Windows (FOLDERID_Screenshots).
#[cfg(windows)]
pub fn known_screenshots_folder() -> Result<PathBuf, String> {
    use windows::Win32::System::Com::CoTaskMemFree;
    use windows::Win32::UI::Shell::{
        FOLDERID_Screenshots, SHGetKnownFolderPath, KF_FLAG_CREATE, KNOWN_FOLDER_FLAG,
    };

    // SAFETY: SHGetKnownFolderPath solo exige un identificador de carpeta
    // conocido y no guarda estado entre llamadas. Devuelve una cadena UTF-16
    // asignada con CoTaskMemAlloc que pasa a ser propiedad del llamante:
    // se libera con CoTaskMemFree antes de salir de la función.
    // <https://learn.microsoft.com/windows/win32/api/shlobj_core/nf-shlobj_core-shgetknownfolderpath>
    let folder = unsafe {
        SHGetKnownFolderPath(
            &FOLDERID_Screenshots,
            KNOWN_FOLDER_FLAG(KF_FLAG_CREATE.0),
            None,
        )
    }
    .map_err(|error| format!("no se pudo resolver la carpeta de capturas de Windows: {error}"))?;

    let folder_text = unsafe { folder.to_string() }.map_err(|error| {
        format!("la carpeta de capturas de Windows no es UTF-16 válida: {error}")
    })?;
    // SAFETY: `folder` es el puntero devuelto por SHGetKnownFolderPath, que
    // se asignó con CoTaskMemAlloc y aún no se ha liberado.
    unsafe { CoTaskMemFree(Some(folder.as_ptr().cast())) };

    Ok(PathBuf::from(folder_text))
}

#[cfg(not(windows))]
pub fn known_screenshots_folder() -> Result<PathBuf, String> {
    Err("Pinza solo vigila carpetas de capturas en Windows".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_env_override_wins() {
        let folder = resolve_watch_folder(Some("C:\\capturas-de-prueba"))
            .expect("la variable de entorno define la carpeta");
        assert_eq!(folder, PathBuf::from("C:\\capturas-de-prueba"));
    }

    #[test]
    fn an_empty_env_override_falls_back_to_the_known_folder() {
        let folder =
            resolve_watch_folder(Some("   ")).expect("un valor vacío cae a la carpeta conocida");
        let _ = folder;
    }

    #[cfg(windows)]
    #[test]
    fn the_known_screenshots_folder_exists() {
        let folder = known_screenshots_folder().expect("Windows da la carpeta de capturas");
        assert!(
            folder.is_dir(),
            "la carpeta conocida existe (o se creó con KF_FLAG_CREATE): {folder:?}"
        );
    }
}
