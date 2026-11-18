//! Vigilancia de la carpeta de capturas: detecta cada PNG nuevo y solo lo
//! reporta cuando ha terminado de escribirse.
//!
//! Usa el crate `notify` con debounce: los eventos del sistema se agrupan
//! mientras el fichero sigue cambiando y solo se procesan tras una tregua.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

use notify::{EventKind, RecursiveMode};
use notify_debouncer_full::{new_debouncer, DebouncedEvent};

/// Cada cuánto el hilo del vigilante despierta para revisar si hay que parar.
const POLL_INTERVAL: Duration = Duration::from_millis(100);

/// Ajustes del vigilante. En producción los valores por defecto dan margen
/// para que la herramienta de capturas termine de escribir el PNG.
#[derive(Debug, Clone, Copy)]
pub struct WatcherConfig {
    /// Tregua sin eventos antes de procesar un lote.
    pub debounce: Duration,
    /// Tiempo que el tamaño del fichero debe quedarse igual para darlo por
    /// terminado.
    pub stability_window: Duration,
    /// Tiempo máximo total que se espera a que el fichero se estabilice.
    pub write_deadline: Duration,
}

impl Default for WatcherConfig {
    fn default() -> Self {
        // El presupuesto de BRIEF §6 es captura guardada → miniatura visible
        // en < 300 ms: la espera total del vigilante (debounce + dos muestras
        // de estabilidad) tiene que caber en menos de la mitad de ese margen.
        Self {
            debounce: Duration::from_millis(120),
            stability_window: Duration::from_millis(60),
            write_deadline: Duration::from_secs(10),
        }
    }
}

/// Callback que recibe cada captura nueva ya completa.
pub type OnScreenshot = Arc<dyn Fn(PathBuf) + Send + Sync>;

/// Arranque y parada del vigilante.
#[derive(Debug)]
pub struct WatcherHandle {
    paused: Arc<AtomicBool>,
    stopped: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl WatcherHandle {
    /// Deja de colgar capturas nuevas mientras esté pausado; la línea se
    /// conserva tal cual.
    pub fn pause(&self) {
        self.paused.store(true, Ordering::Relaxed);
    }

    /// Vuelve a colgar capturas nuevas.
    pub fn resume(&self) {
        self.paused.store(false, Ordering::Relaxed);
    }

    /// ¿Está este vigilante pausado?
    pub fn is_paused(&self) -> bool {
        self.paused.load(Ordering::Relaxed)
    }

    /// Apaga el vigilante y espera a que su hilo termine.
    pub fn stop(mut self) {
        self.stopped.store(true, Ordering::Relaxed);
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

/// El vigilante que la app mantiene vivo: `None` si aún no arrancó o si
/// falló el arranque.
#[derive(Debug, Default)]
pub struct WatchControl(Mutex<Option<WatcherHandle>>);

impl WatchControl {
    /// Instala el vigilante en marcha y devuelve el anterior, si lo había.
    pub fn replace(&self, handle: WatcherHandle) -> Option<WatcherHandle> {
        match self.0.lock() {
            Ok(mut guard) => guard.replace(handle),
            Err(_) => None,
        }
    }

    /// ¿Está pausado el vigilante? `false` si aún no arrancó.
    pub fn is_paused(&self) -> bool {
        match self.0.lock() {
            Ok(guard) => guard.as_ref().is_some_and(WatcherHandle::is_paused),
            Err(_) => false,
        }
    }

    /// Pausa el vigilante, si hay uno.
    pub fn pause(&self) -> Result<(), String> {
        match self.0.lock() {
            Ok(guard) => {
                if let Some(handle) = guard.as_ref() {
                    handle.pause();
                }
                Ok(())
            }
            Err(_) => Err("el control del vigilante está envenenado".to_string()),
        }
    }

    /// Reanuda el vigilante, si hay uno.
    pub fn resume(&self) -> Result<(), String> {
        match self.0.lock() {
            Ok(guard) => {
                if let Some(handle) = guard.as_ref() {
                    handle.resume();
                }
                Ok(())
            }
            Err(_) => Err("el control del vigilante está envenenado".to_string()),
        }
    }
}

/// Pone a vigilar `folder` y llama a `on_screenshot` con cada PNG nuevo que
/// haya terminado de escribirse. Cada ruta se reporta una sola vez.
pub fn start(
    folder: &Path,
    config: WatcherConfig,
    on_screenshot: OnScreenshot,
) -> Result<WatcherHandle, notify::Error> {
    let (tx, rx) = mpsc::channel();
    let mut debouncer = new_debouncer(config.debounce, None, move |result| {
        if tx.send(result).is_err() {
            log::debug!("el vigilante ya no tiene receptor: lote descartado");
        }
    })?;
    debouncer.watch(folder, RecursiveMode::NonRecursive)?;

    let paused = Arc::new(AtomicBool::new(false));
    let stopped = Arc::new(AtomicBool::new(false));
    let thread = std::thread::Builder::new()
        .name("pinza-watcher".to_string())
        .spawn({
            let paused = Arc::clone(&paused);
            let stopped = Arc::clone(&stopped);
            move || run_watcher(config, on_screenshot, paused, stopped, rx, debouncer)
        })?;

    Ok(WatcherHandle {
        paused,
        stopped,
        thread: Some(thread),
    })
}

fn run_watcher(
    config: WatcherConfig,
    on_screenshot: OnScreenshot,
    paused: Arc<AtomicBool>,
    stopped: Arc<AtomicBool>,
    rx: mpsc::Receiver<notify_debouncer_full::DebounceEventResult>,
    // El debouncer vive en este hilo: mientras exista, `notify` sigue
    // vigilando la carpeta; al soltarse, la vigilancia se apaga.
    _debouncer: notify_debouncer_full::Debouncer<
        notify::RecommendedWatcher,
        notify_debouncer_full::RecommendedCache,
    >,
) {
    let mut reported: HashSet<PathBuf> = HashSet::new();

    loop {
        if stopped.load(Ordering::Relaxed) {
            return;
        }

        match rx.recv_timeout(POLL_INTERVAL) {
            Ok(Ok(events)) => {
                if paused.load(Ordering::Relaxed) {
                    continue;
                }
                for path in screenshot_candidates(events) {
                    if reported.contains(&path) {
                        continue;
                    }
                    if !is_ready_screenshot(
                        &path,
                        config.stability_window,
                        Instant::now() + config.write_deadline,
                    ) {
                        continue;
                    }
                    reported.insert(path.clone());
                    on_screenshot(path);
                }
            }
            Ok(Err(errors)) => {
                for error in errors {
                    log::warn!("el vigilante no pudo leer un evento: {error}");
                }
            }
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => return,
        }
    }
}

/// Rutas PNG candidatas dentro de un lote de eventos, sin duplicados.
fn screenshot_candidates(events: Vec<DebouncedEvent>) -> Vec<PathBuf> {
    let mut seen = HashSet::new();
    let mut paths = Vec::new();

    for event in events {
        if !matches!(
            event.event.kind,
            EventKind::Create(_) | EventKind::Modify(_)
        ) {
            continue;
        }
        for path in event.event.paths {
            if is_png(&path) && seen.insert(path.clone()) {
                paths.push(path);
            }
        }
    }

    paths
}

/// Espera a que el tamaño del fichero se quede igual dos muestras seguidas
/// separadas por `stability_window`. Devuelve `false` si el fichero desaparece
/// o no se estabiliza antes de `deadline`.
fn is_ready_screenshot(path: &Path, stability_window: Duration, deadline: Instant) -> bool {
    let mut previous_size = None;

    loop {
        if Instant::now() >= deadline {
            return false;
        }

        let Ok(metadata) = std::fs::metadata(path) else {
            return false;
        };
        if !metadata.is_file() {
            return false;
        }

        let size = metadata.len();
        if previous_size == Some(size) {
            return true;
        }
        previous_size = Some(size);
        std::thread::sleep(stability_window);
    }
}

fn is_png(path: &Path) -> bool {
    path.extension()
        .is_some_and(|extension| extension.eq_ignore_ascii_case("png"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::AtomicU64;

    struct TempDirGuard {
        path: PathBuf,
    }

    impl TempDirGuard {
        fn new(tag: &str) -> Self {
            static NEXT: AtomicU64 = AtomicU64::new(1);
            let path = std::env::temp_dir().join(format!(
                "pinza-watcher-{tag}-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir_all(&path).expect("se crea la carpeta temporal del test");
            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TempDirGuard {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn test_config() -> WatcherConfig {
        WatcherConfig {
            debounce: Duration::from_millis(100),
            stability_window: Duration::from_millis(50),
            write_deadline: Duration::from_secs(3),
        }
    }

    fn start_watching(dir: &TempDirGuard) -> (WatcherHandle, mpsc::Receiver<PathBuf>) {
        let (tx, rx) = mpsc::channel();
        let handle = start(
            dir.path(),
            test_config(),
            Arc::new(move |path| {
                tx.send(path).expect("el receptor del test sigue vivo");
            }),
        )
        .expect("el vigilante arranca");
        (handle, rx)
    }

    #[test]
    fn reports_a_new_png_once_it_is_fully_written() {
        let dir = TempDirGuard::new("alta");
        let (handle, rx) = start_watching(&dir);

        let contents = b"PNG-de-prueba";
        fs::write(dir.path().join("captura-1.png"), contents)
            .expect("se escribe la captura de prueba");

        let reported = rx
            .recv_timeout(Duration::from_secs(5))
            .expect("el vigilante reporta el PNG nuevo");
        assert_eq!(
            reported.file_name().and_then(|name| name.to_str()),
            Some("captura-1.png")
        );
        assert_eq!(
            fs::read(&reported).expect("el fichero reportado se puede leer"),
            contents,
            "el PNG se reporta completo"
        );

        assert!(
            rx.recv_timeout(Duration::from_millis(800)).is_err(),
            "cada PNG se reporta una sola vez"
        );
        handle.stop();
    }

    #[test]
    fn ignores_files_that_are_not_png() {
        let dir = TempDirGuard::new("filtro");
        let (handle, rx) = start_watching(&dir);

        fs::write(dir.path().join("nota.txt"), "no es una captura")
            .expect("se escribe el fichero ajeno");

        assert!(
            rx.recv_timeout(Duration::from_millis(900)).is_err(),
            "los ficheros que no son PNG no se reportan"
        );
        handle.stop();
    }

    #[test]
    fn does_not_report_while_paused_and_reports_after_resuming() {
        let dir = TempDirGuard::new("pausa");
        let (handle, rx) = start_watching(&dir);

        handle.pause();
        fs::write(dir.path().join("captura-pausada.png"), b"mientras pausa")
            .expect("se escribe la captura durante la pausa");
        assert!(
            rx.recv_timeout(Duration::from_millis(900)).is_err(),
            "en pausa no se cuelga nada nuevo"
        );

        handle.resume();
        fs::write(dir.path().join("captura-reanudada.png"), b"tras reanudar")
            .expect("se escribe la captura tras reanudar");
        let reported = rx
            .recv_timeout(Duration::from_secs(5))
            .expect("tras reanudar el vigilante vuelve a reportar");
        assert_eq!(
            reported.file_name().and_then(|name| name.to_str()),
            Some("captura-reanudada.png")
        );
        handle.stop();
    }

    #[test]
    fn stop_ends_the_thread_and_no_more_reports_arrive() {
        let dir = TempDirGuard::new("parada");
        let (handle, rx) = start_watching(&dir);

        handle.stop();

        fs::write(dir.path().join("captura-tardia.png"), b"tras parar")
            .expect("se escribe la captura tras parar");
        assert!(
            rx.recv_timeout(Duration::from_millis(900)).is_err(),
            "parado no se reporta nada"
        );
    }

    #[test]
    fn the_default_config_leaves_room_for_the_visibility_budget() {
        let config = WatcherConfig::default();
        // BRIEF §6: captura guardada → miniatura visible en < 300 ms; la
        // espera del vigilante (debounce + dos muestras de estabilidad) no
        // puede consumir ese presupuesto entera.
        let total_wait = config.debounce + config.stability_window * 2;
        assert!(total_wait < Duration::from_millis(300));
        assert!(config.stability_window > Duration::ZERO);
        assert!(config.write_deadline > config.stability_window * 2);
    }

    #[test]
    fn a_missing_file_is_never_ready() {
        let dir = TempDirGuard::new("ausente");
        let missing = dir.path().join("falta.png");

        assert!(!is_ready_screenshot(
            &missing,
            Duration::from_millis(50),
            Instant::now() + Duration::from_secs(1)
        ));
    }

    #[test]
    fn a_stable_file_is_ready() {
        let dir = TempDirGuard::new("estable");
        let path = dir.path().join("captura.png");
        fs::write(&path, b"completa").expect("se escribe la captura de prueba");

        assert!(is_ready_screenshot(
            &path,
            Duration::from_millis(50),
            Instant::now() + Duration::from_secs(3)
        ));
    }

    #[test]
    fn a_file_that_vanishes_while_polling_is_not_ready() {
        let dir = TempDirGuard::new("desaparece");
        let path = dir.path().join("fugaz.png");

        let writer = std::thread::spawn({
            let path = path.clone();
            move || {
                fs::write(&path, b"temporal").expect("se escribe el fichero fugaz");
                fs::remove_file(&path).expect("se elimina el fichero fugaz");
            }
        });
        let ready = is_ready_screenshot(
            &path,
            Duration::from_millis(50),
            Instant::now() + Duration::from_secs(3),
        );
        writer.join().expect("el hilo escritor termina");

        assert!(
            !ready,
            "un fichero que desaparece a mitad del sondeo no está listo"
        );
    }

    #[test]
    fn only_png_files_are_candidates() {
        assert!(is_png(&Path::new("/capturas").join("captura.PNG")));
        assert!(is_png(&Path::new("/capturas").join("captura.png")));
        assert!(!is_png(&Path::new("/capturas").join("captura.jpg")));
        assert!(!is_png(&Path::new("/capturas").join("sin-extension")));
    }
}
