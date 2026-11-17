//! Creación y posición de las ventanas de Pinza.

use serde::Deserialize;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

/// Etiqueta de la ventana que vive siempre colgada del borde superior.
pub const LINE_LABEL: &str = "line";

/// Alto de la franja de la línea, en píxeles físicos.
pub const LINE_HEIGHT: u32 = 160;

/// Ventanas que se crean bajo demanda y se destruyen al cerrarse.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WindowKind {
    Editor,
    Settings,
    Onboarding,
}

impl WindowKind {
    pub fn label(self) -> &'static str {
        match self {
            Self::Editor => "editor",
            Self::Settings => "settings",
            Self::Onboarding => "onboarding",
        }
    }

    /// Ruta del export estático que carga la ventana.
    pub fn route(self) -> &'static str {
        match self {
            Self::Editor => "editor",
            Self::Settings => "settings",
            Self::Onboarding => "onboarding",
        }
    }

    pub fn title(self) -> &'static str {
        match self {
            Self::Editor => "Anotar captura",
            Self::Settings => "Ajustes de Pinza",
            Self::Onboarding => "Primeros pasos",
        }
    }

    pub fn inner_size(self) -> (f64, f64) {
        match self {
            Self::Editor => (1080.0, 720.0),
            Self::Settings => (720.0, 640.0),
            Self::Onboarding => (720.0, 560.0),
        }
    }
}

/// Trae al frente la ventana pedida o la crea si todavía no existe.
pub fn open(app: &AppHandle, kind: WindowKind) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(kind.label()) {
        window.set_focus()?;
        return Ok(());
    }

    let (width, height) = kind.inner_size();
    let route = format!("{}/", kind.route());

    WebviewWindowBuilder::new(app, kind.label(), WebviewUrl::App(route.into()))
        .title(kind.title())
        .inner_size(width, height)
        .resizable(true)
        .center()
        .build()?;

    Ok(())
}

/// Estira la línea a lo ancho del monitor principal, pegada al borde superior.
pub fn attach_line_to_primary_monitor(app: &AppHandle) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window(LINE_LABEL) else {
        log::warn!("tauri.conf.json no declara la ventana {LINE_LABEL}");
        return Ok(());
    };

    let Some(monitor) = window.primary_monitor()? else {
        log::warn!("no hay monitor principal: la línea conserva su tamaño por defecto");
        return Ok(());
    };

    let origin = monitor.position();
    let size = monitor.size();

    window.set_position(PhysicalPosition::new(origin.x, origin.y))?;
    window.set_size(PhysicalSize::new(size.width, LINE_HEIGHT))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const KINDS: [WindowKind; 3] = [
        WindowKind::Editor,
        WindowKind::Settings,
        WindowKind::Onboarding,
    ];

    #[test]
    fn every_kind_has_its_own_label_route_and_size() {
        let labels: Vec<&str> = KINDS.iter().map(|kind| kind.label()).collect();
        assert_eq!(labels, ["editor", "settings", "onboarding"]);

        for kind in KINDS {
            assert_eq!(kind.label(), kind.route());
            assert!(!kind.title().is_empty());

            let (width, height) = kind.inner_size();
            assert!(width > 0.0 && height > 0.0);
        }
    }

    #[test]
    fn kinds_deserialize_from_the_label_the_web_sends() {
        for kind in KINDS {
            let payload = format!("\"{}\"", kind.label());
            let deserialized: WindowKind =
                serde_json::from_str(&payload).expect("la etiqueta de la ventana es válida");

            assert_eq!(deserialized, kind);
        }
    }

    #[test]
    fn an_unknown_label_is_rejected() {
        assert!(serde_json::from_str::<WindowKind>("\"line\"").is_err());
    }
}
