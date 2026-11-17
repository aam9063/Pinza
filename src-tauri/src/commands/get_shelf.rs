use std::sync::Mutex;

use crate::shelf::{Shelf, ShelfEntry};

/// Devuelve las capturas colgadas en la línea, de la más antigua a la más
/// nueva. Es una copia: la web nunca modifica el estado de Rust.
#[tauri::command]
pub fn get_shelf(shelf: tauri::State<'_, Mutex<Shelf>>) -> Vec<ShelfEntry> {
    match shelf.lock() {
        Ok(shelf) => shelf.entries(),
        Err(poisoned) => {
            log::warn!("la línea estaba envenenada al consultarla; se recupera lo posible");
            poisoned.into_inner().entries()
        }
    }
}
