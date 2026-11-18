use serde::Deserialize;

/// Rectángulo físico (px de pantalla) de una miniatura dentro de la franja.
#[derive(Debug, Clone, Copy, Deserialize)]
pub struct ThumbRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl ThumbRect {
    pub fn contains(&self, x: i32, y: i32) -> bool {
        let (fx, fy) = (f64::from(x), f64::from(y));
        fx >= self.x && fx < self.x + self.width && fy >= self.y && fy < self.y + self.height
    }
}

/// La web publica los rectángulos físicos de sus miniaturas: el shell sondea
/// el cursor y activa el ratón solo sobre ellas (BRIEF §5.4, ventana `line`:
/// ignora el ratón salvo encima de las miniaturas). Mientras la ventana
/// ignora el ratón, la web no recibe eventos: por eso decide Rust, no la web.
#[tauri::command]
pub fn set_thumbnail_rects(
    rects: tauri::State<'_, std::sync::Mutex<Vec<ThumbRect>>>,
    thumbnails: Vec<ThumbRect>,
) -> Result<(), String> {
    let mut guard = rects
        .lock()
        .map_err(|_| "la tabla de rectángulos está envenenada".to_string())?;
    *guard = thumbnails;
    Ok(())
}
