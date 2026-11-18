//! El estado de la línea: la lista de capturas colgadas, del más antiguo al
//! más reciente, con un tope configurable.
//!
//! Descuelgar (por tope o a petición) nunca borra el fichero del disco: solo
//! quita la captura de la línea.

use std::collections::VecDeque;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

/// Tope de capturas colgadas por defecto (`BRIEF.md` §3).
pub const DEFAULT_MAX_ENTRIES: usize = 10;

static NEXT_ENTRY_ID: AtomicU64 = AtomicU64::new(1);

/// Una captura colgada en la línea. El fichero siempre vive en la carpeta
/// vigilada: la línea solo guarda una referencia.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShelfEntry {
    id: u64,
    path: PathBuf,
    /// Miniatura servida por el protocolo de assets; vacía si aún no se
    /// generó (la captura se cuelga igual, la miniatura llega cuando pueda).
    thumbnail: PathBuf,
    file_name: String,
    /// Milisegundos desde la época Unix (hora del fichero según el disco).
    captured_at: u64,
}

impl ShelfEntry {
    /// Crea una entrada a mano (para tests y para colgar sin tocar el disco).
    pub fn new(path: PathBuf, captured_at: u64) -> Self {
        let file_name = path.file_name().map_or_else(
            || path.to_string_lossy().to_string(),
            |name| name.to_string_lossy().to_string(),
        );

        Self {
            id: NEXT_ENTRY_ID.fetch_add(1, Ordering::Relaxed),
            path,
            thumbnail: PathBuf::new(),
            file_name,
            captured_at,
        }
    }

    /// Adjunta la ruta de la miniatura generada en la caché.
    pub fn with_thumbnail(mut self, thumbnail: PathBuf) -> Self {
        self.thumbnail = thumbnail;
        self
    }

    /// Crea una entrada leyendo la hora de captura de los metadatos del
    /// fichero. Si el disco no da hora, se usa la actual.
    pub fn from_path(path: &Path) -> Self {
        let captured_at = fs_metadata_epoch_millis(path);
        Self::new(path.to_path_buf(), captured_at)
    }

    // La API completa de la línea queda lista para M1b (descolgar por
    // petición, pintar); hasta entonces solo los tests la ejercitan.
    #[allow(dead_code)]
    pub fn id(&self) -> u64 {
        self.id
    }

    #[allow(dead_code)]
    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn file_name(&self) -> &str {
        &self.file_name
    }

    #[allow(dead_code)]
    pub fn captured_at(&self) -> u64 {
        self.captured_at
    }
}

fn fs_metadata_epoch_millis(path: &Path) -> u64 {
    let now = SystemTime::now();
    let modified = std::fs::metadata(path)
        .ok()
        .and_then(|metadata| metadata.modified().ok());
    modified
        .unwrap_or(now)
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| elapsed.as_millis() as u64)
}

/// Resultado de colgar una captura en la línea.
#[derive(Debug, PartialEq, Eq)]
pub enum HangOutcome {
    /// La captura entró en la línea; `evicted` trae la más antigua si el tope
    /// la descolgó (su fichero sigue intacto en el disco).
    Hung { evicted: Option<ShelfEntry> },
    /// Esa ruta ya estaba colgada: no se colga dos veces.
    AlreadyHung,
}

/// La lista de capturas colgadas, ordenada de la más antigua a la más nueva.
#[derive(Debug)]
pub struct Shelf {
    max_entries: usize,
    entries: VecDeque<ShelfEntry>,
}

impl Default for Shelf {
    fn default() -> Self {
        Self::new(DEFAULT_MAX_ENTRIES)
    }
}

impl Shelf {
    /// Crea una línea con el tope pedido (mínimo 1 captura).
    pub fn new(max_entries: usize) -> Self {
        Self {
            max_entries: max_entries.max(1),
            entries: VecDeque::new(),
        }
    }

    /// Cambia el tope al vuelo (ajustes); si baja, las más antiguas se
    /// descolgan de inmediato y se devuelven; sus ficheros nunca se borran.
    pub fn set_max_entries(&mut self, max_entries: usize) -> Vec<ShelfEntry> {
        self.max_entries = max_entries.max(1);
        let mut evicted = Vec::new();
        while self.entries.len() > self.max_entries {
            match self.entries.pop_front() {
                Some(entry) => evicted.push(entry),
                None => break,
            }
        }
        evicted
    }

    /// Cuelga una captura al final de la línea. Si el tope se supera, la más
    /// antigua se descolga y se devuelve; su fichero nunca se borra.
    pub fn hang(&mut self, entry: ShelfEntry) -> HangOutcome {
        if self.entries.iter().any(|hung| hung.path == entry.path) {
            return HangOutcome::AlreadyHung;
        }

        self.entries.push_back(entry);
        let mut evicted = None;
        while self.entries.len() > self.max_entries {
            evicted = self.entries.pop_front();
        }

        HangOutcome::Hung { evicted }
    }

    /// Descolga la captura con ese identificador y la devuelve.
    #[allow(dead_code)]
    pub fn unhang(&mut self, id: u64) -> Option<ShelfEntry> {
        let position = self.entries.iter().position(|entry| entry.id == id)?;
        self.entries.remove(position)
    }

    /// Copia de las capturas colgadas, de la más antigua a la más nueva.
    pub fn entries(&self) -> Vec<ShelfEntry> {
        self.entries.iter().cloned().collect()
    }

    #[allow(dead_code)]
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    #[allow(dead_code)]
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    #[allow(dead_code)]
    pub fn max_entries(&self) -> usize {
        self.max_entries
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    struct TempDirGuard {
        path: PathBuf,
    }

    impl TempDirGuard {
        fn new(tag: &str) -> Self {
            static NEXT: AtomicU64 = AtomicU64::new(1);
            let path = std::env::temp_dir().join(format!(
                "pinza-shelf-{tag}-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            std::fs::create_dir_all(&path).expect("se crea la carpeta temporal del test");
            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TempDirGuard {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.path);
        }
    }

    fn entry(dir: &Path, name: &str, captured_at: u64) -> ShelfEntry {
        ShelfEntry::new(dir.join(name), captured_at)
    }

    #[test]
    fn hanging_keeps_oldest_first_order() {
        let mut shelf = Shelf::new(3);

        for (index, name) in ["a.png", "b.png", "c.png"].iter().enumerate() {
            let outcome = shelf.hang(entry(Path::new("/capturas"), name, index as u64));
            assert_eq!(outcome, HangOutcome::Hung { evicted: None });
        }

        let entries = shelf.entries();
        let names: Vec<&str> = entries.iter().map(|entry| entry.file_name()).collect();
        assert_eq!(names, ["a.png", "b.png", "c.png"]);
        assert_eq!(shelf.len(), 3);
        assert!(!shelf.is_empty());
    }

    #[test]
    fn exceeding_the_limit_unhangs_the_oldest_without_touching_its_file() {
        let dir = TempDirGuard::new("tope");
        let oldest = dir.path().join("a.png");
        std::fs::write(&oldest, b"primera").expect("se escribe la captura de prueba");

        let mut shelf = Shelf::new(2);
        shelf.hang(ShelfEntry::from_path(&oldest));
        shelf.hang(entry(dir.path(), "b.png", 2));

        let outcome = shelf.hang(entry(dir.path(), "c.png", 3));
        let HangOutcome::Hung { evicted } = outcome else {
            panic!("el tercer colgado entra en la línea");
        };

        let evicted = evicted.expect("el tope descolga la más antigua");
        assert_eq!(evicted.file_name(), "a.png");

        let entries = shelf.entries();
        let names: Vec<&str> = entries.iter().map(|entry| entry.file_name()).collect();
        assert_eq!(names, ["b.png", "c.png"]);

        let kept = std::fs::read(&oldest).expect("el fichero descolgado sigue en el disco");
        assert_eq!(kept, b"primera");
    }

    #[test]
    fn the_same_path_is_not_hung_twice() {
        let mut shelf = Shelf::new(3);
        let path = Path::new("/capturas").join("a.png");

        shelf.hang(ShelfEntry::new(path.clone(), 1));
        let outcome = shelf.hang(ShelfEntry::new(path, 2));

        assert_eq!(outcome, HangOutcome::AlreadyHung);
        assert_eq!(shelf.len(), 1);
    }

    #[test]
    fn lowering_the_limit_evicts_the_oldest_in_order() {
        let mut shelf = Shelf::new(3);
        for index in 0..3 {
            let _ = shelf.hang(ShelfEntry::new(
                Path::new("/capturas").join(format!("{index}.png")),
                0,
            ));
        }
        let evicted = shelf.set_max_entries(1);
        assert_eq!(evicted.len(), 2);
        assert_eq!(evicted[0].file_name(), "0.png");
        assert_eq!(evicted[1].file_name(), "1.png");
        assert_eq!(shelf.len(), 1);
        assert_eq!(shelf.entries()[0].file_name(), "2.png");
    }

    #[test]
    fn unhanging_removes_only_the_requested_entry() {
        let mut shelf = Shelf::new(3);
        for (index, name) in ["a.png", "b.png", "c.png"].iter().enumerate() {
            shelf.hang(entry(Path::new("/capturas"), name, index as u64));
        }

        let hung = shelf.entries();
        let removed = shelf.unhang(hung[1].id()).expect("b.png está colgada");
        assert_eq!(removed.file_name(), "b.png");

        let entries = shelf.entries();
        let names: Vec<&str> = entries.iter().map(|entry| entry.file_name()).collect();
        assert_eq!(names, ["a.png", "c.png"]);
    }

    #[test]
    fn unhanging_an_unknown_id_returns_nothing() {
        let mut shelf = Shelf::new(2);
        shelf.hang(entry(Path::new("/capturas"), "a.png", 1));

        assert!(shelf.unhang(9_999).is_none());
        assert_eq!(shelf.len(), 1);
    }

    #[test]
    fn the_default_limit_is_ten_entries() {
        assert_eq!(DEFAULT_MAX_ENTRIES, 10);

        let mut shelf = Shelf::default();
        assert_eq!(shelf.max_entries(), 10);

        for index in 0..DEFAULT_MAX_ENTRIES + 1 {
            shelf.hang(ShelfEntry::new(
                Path::new("/capturas").join(format!("captura-{index}.png")),
                index as u64,
            ));
        }

        assert_eq!(shelf.len(), DEFAULT_MAX_ENTRIES);
        assert_eq!(
            shelf.entries()[0].file_name(),
            "captura-1.png",
            "la primera captura se descolgó al superar el tope"
        );
    }

    #[test]
    fn a_limit_below_one_is_raised_to_one() {
        let mut shelf = Shelf::new(0);
        shelf.hang(entry(Path::new("/capturas"), "a.png", 1));
        shelf.hang(entry(Path::new("/capturas"), "b.png", 2));

        assert_eq!(shelf.len(), 1);
        assert_eq!(shelf.entries()[0].file_name(), "b.png");
    }

    #[test]
    fn entries_serialize_with_camel_case_keys() {
        let entry = ShelfEntry::new(
            Path::new("/capturas").join("captura.png"),
            1_720_000_000_000,
        );

        let payload = serde_json::to_value(&entry).expect("la entrada se serializa");
        assert_eq!(
            payload,
            json!({
                "id": entry.id(),
                "path": entry.path().to_string_lossy(),
                "fileName": "captura.png",
                "thumbnail": "",
                "capturedAt": 1_720_000_000_000u64,
            })
        );
        assert_eq!(
            payload
                .as_object()
                .expect("el payload es un objeto")
                .keys()
                .count(),
            5
        );
    }

    #[test]
    fn ids_are_unique_per_entry() {
        let first = entry(Path::new("/capturas"), "a.png", 1);
        let second = entry(Path::new("/capturas"), "b.png", 2);

        assert_ne!(first.id(), second.id());
    }

    #[test]
    fn from_path_uses_the_file_metadata_for_the_capture_time() {
        let dir = TempDirGuard::new("metadatos");
        let path = dir.path().join("captura.png");
        std::fs::write(&path, b"contenido").expect("se escribe la captura de prueba");

        let entry = ShelfEntry::from_path(&path);

        assert_eq!(entry.file_name(), "captura.png");
        assert_eq!(entry.path(), path);
        let now_millis = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("la época Unix es anterior a ahora")
            .as_millis() as u64;
        assert!(
            entry.captured_at() <= now_millis,
            "la hora de captura viene de los metadatos del fichero"
        );
    }
}
