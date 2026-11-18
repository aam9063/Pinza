//! Textos de la interfaz nativa (bandeja). Un único sitio por cadena: la
//! infraestructura de i18n del BRIEF (flujo 5) parte del es-ES y está lista
//! para añadir más idiomas cambiando este módulo.

/// Devuelve el texto de la bandeja para la clave pedida.
pub fn tray_text(key: &str) -> &str {
    match key {
        "toggle-line" => "Mostrar u ocultar la línea",
        "open-folder" => "Abrir carpeta de capturas",
        "pause-watching" => "Pausar la vigilancia",
        "resume-watching" => "Reanudar la vigilancia",
        "open-settings" => "Ajustes…",
        "quit" => "Salir",
        "tooltip" => "Pinza",
        _ => key,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_menu_key_has_a_spanish_string() {
        for key in [
            "toggle-line",
            "open-folder",
            "pause-watching",
            "resume-watching",
            "open-settings",
            "quit",
            "tooltip",
        ] {
            assert_ne!(tray_text(key), key, "la clave {key} no tiene texto");
        }
    }

    #[test]
    fn unknown_keys_return_the_key_itself() {
        assert_eq!(tray_text("clave-inventada"), "clave-inventada");
    }
}
