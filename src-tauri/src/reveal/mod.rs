//! Despliegue y ocultado de la línea (BRIEF §3, flujo 2).
//!
//! La lógica pura vive en [`RevealMachine`]: cada tick decide si la línea
//! debe mostrarse, ocultarse o quedarse como está, a partir del cursor, de la
//! permanencia en la zona del borde y de si hay una app en pantalla completa.
//! El hilo de sondeo traduce esas decisiones a `window.show/hide` y a los
//! eventos `line:show` / `line:hide` hacia la web.

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

/// Grosor de la zona del borde superior que despliega la línea (2 a 4 px).
pub const EDGE_ZONE_PX: i32 = 4;

/// Permanencia necesaria en la zona del borde antes de desplegar.
pub const EDGE_DWELL: Duration = Duration::from_millis(150);

/// Retardo corto de ocultado al salir el ratón de la franja.
pub const HIDE_DELAY: Duration = Duration::from_millis(700);

/// Estado de la línea y decisiones del sondeo.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    Nothing,
    Show,
    Hide,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum State {
    Hidden,
    Shown,
}

/// Entradas del tick, en unidades puras para poder probarlas sin Win32.
#[derive(Debug, Clone, Copy)]
pub struct Tick {
    /// El cursor está dentro de la zona del borde superior.
    pub cursor_in_edge_zone: bool,
    /// El cursor está dentro de la franja de la línea (o sobre ella).
    pub cursor_in_strip: bool,
    /// Hay una ventana a pantalla completa en el monitor primario.
    pub fullscreen: bool,
    /// Tiempo transcurrido desde el instante de referencia del tick.
    pub now: Instant,
}

/// Máquina de estados del despliegue. Rust es la fuente de verdad de si la
/// línea está visible; la web solo anima lo que este módulo decide.
#[derive(Debug)]
pub struct RevealMachine {
    state: State,
    dwell_started: Option<Instant>,
    left_strip_at: Option<Instant>,
    /// Tras ocultar con el atajo, la zona del borde queda desarmada hasta que
    /// el cursor la abandona: evita que la línea vuelva a salir sola debajo
    /// del cursor que acabamos de ocultar.
    edge_armed: bool,
}

impl Default for RevealMachine {
    fn default() -> Self {
        Self::new()
    }
}

impl RevealMachine {
    pub fn new() -> Self {
        Self {
            state: State::Hidden,
            dwell_started: None,
            left_strip_at: None,
            edge_armed: true,
        }
    }

    pub fn is_shown(&self) -> bool {
        self.state == State::Shown
    }

    /// Alterna la línea con el atajo global. Mostrar respeta el bloqueo de
    /// pantalla completa; ocultar desarma la zona del borde hasta que el
    /// cursor la abandone.
    pub fn toggle(&mut self, fullscreen: bool) -> Action {
        if self.state == State::Shown {
            self.state = State::Hidden;
            self.left_strip_at = None;
            self.dwell_started = None;
            self.edge_armed = false;
            return Action::Hide;
        }
        if fullscreen {
            return Action::Nothing;
        }
        self.state = State::Shown;
        self.left_strip_at = None;
        self.dwell_started = None;
        Action::Show
    }

    /// Procesa un tick y devuelve la acción a ejecutar.
    pub fn tick(&mut self, tick: Tick) -> Action {
        match self.state {
            State::Hidden => self.tick_hidden(tick),
            State::Shown => self.tick_shown(tick),
        }
    }

    fn tick_hidden(&mut self, tick: Tick) -> Action {
        // Nunca aparece mientras hay una app en pantalla completa (S4).
        if tick.fullscreen {
            self.dwell_started = None;
            self.edge_armed = true;
            return Action::Nothing;
        }

        if tick.cursor_in_edge_zone {
            if !self.edge_armed {
                return Action::Nothing;
            }
            let started = *self.dwell_started.get_or_insert(tick.now);
            if tick.now.duration_since(started) >= EDGE_DWELL {
                self.state = State::Shown;
                self.left_strip_at = None;
                self.dwell_started = None;
                return Action::Show;
            }
        } else {
            self.edge_armed = true;
            self.dwell_started = None;
        }
        Action::Nothing
    }

    fn tick_shown(&mut self, tick: Tick) -> Action {
        // Una app a pantalla completa la esconde de inmediato (S4).
        if tick.fullscreen {
            self.state = State::Hidden;
            self.left_strip_at = None;
            return Action::Hide;
        }

        if tick.cursor_in_strip {
            self.left_strip_at = None;
            return Action::Nothing;
        }

        let left_at = self.left_strip_at.get_or_insert(tick.now);
        if tick.now.duration_since(*left_at) >= HIDE_DELAY {
            self.state = State::Hidden;
            self.left_strip_at = None;
            return Action::Hide;
        }
        Action::Nothing
    }
}

/// Órdenes manuales hacia el bucle de sondeo: el atajo global pide alternar
/// y el sondeo lo atiende en su siguiente tick.
#[derive(Debug, Default)]
pub struct RevealControl {
    toggle_requested: AtomicBool,
}

impl RevealControl {
    pub fn request_toggle(&self) {
        self.toggle_requested.store(true, Ordering::Relaxed);
    }

    pub fn take_toggle(&self) -> bool {
        self.toggle_requested.swap(false, Ordering::Relaxed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tick_at(now: Instant) -> Tick {
        Tick {
            cursor_in_edge_zone: false,
            cursor_in_strip: false,
            fullscreen: false,
            now,
        }
    }

    #[test]
    fn dwelling_on_the_edge_for_the_dwell_time_shows_the_line() {
        let mut machine = RevealMachine::new();
        let t0 = Instant::now();

        let mut t = tick_at(t0);
        t.cursor_in_edge_zone = true;
        assert_eq!(machine.tick(t), Action::Nothing);

        let mut early = tick_at(t0 + Duration::from_millis(100));
        early.cursor_in_edge_zone = true;
        assert_eq!(machine.tick(early), Action::Nothing);

        let mut late = tick_at(t0 + Duration::from_millis(150));
        late.cursor_in_edge_zone = true;
        assert_eq!(machine.tick(late), Action::Show);
        assert!(machine.is_shown());
    }

    #[test]
    fn leaving_the_edge_zone_before_the_dwell_resets_the_clock() {
        let mut machine = RevealMachine::new();
        let t0 = Instant::now();

        let mut inside = tick_at(t0);
        inside.cursor_in_edge_zone = true;
        assert_eq!(machine.tick(inside), Action::Nothing);

        assert_eq!(
            machine.tick(tick_at(t0 + Duration::from_millis(80))),
            Action::Nothing
        );

        let mut back = tick_at(t0 + Duration::from_millis(200));
        back.cursor_in_edge_zone = true;
        assert_eq!(machine.tick(back), Action::Nothing);

        let mut dwell = tick_at(t0 + Duration::from_millis(350));
        dwell.cursor_in_edge_zone = true;
        assert_eq!(machine.tick(dwell), Action::Show);
    }

    #[test]
    fn the_line_hides_after_the_delay_once_the_cursor_leaves_the_strip() {
        let mut machine = RevealMachine::new();
        let t0 = Instant::now();

        let mut inside = tick_at(t0);
        inside.cursor_in_edge_zone = true;
        let _ = machine.tick(inside);
        let _ = machine.tick(tick_at(t0 + EDGE_DWELL).tap_edge());
        assert!(machine.is_shown());

        // Sale de la franja: el retardo aún no venció.
        let mut just_left = tick_at(t0 + EDGE_DWELL + Duration::from_millis(300));
        just_left.cursor_in_strip = false;
        assert_eq!(machine.tick(just_left), Action::Nothing);

        // El cursor vuelve: la cuenta se reinicia.
        let mut returns = tick_at(t0 + EDGE_DWELL + Duration::from_millis(500));
        returns.cursor_in_strip = true;
        assert_eq!(machine.tick(returns), Action::Nothing);

        // Vuelve a salir y esta vez el retardo vence.
        let mut out = tick_at(t0 + EDGE_DWELL + Duration::from_millis(900));
        out.cursor_in_strip = false;
        assert_eq!(machine.tick(out), Action::Nothing);

        let mut late = tick_at(t0 + EDGE_DWELL + Duration::from_millis(1_650));
        late.cursor_in_strip = false;
        assert_eq!(machine.tick(late), Action::Hide);
        assert!(!machine.is_shown());
    }

    #[test]
    fn fullscreen_never_shows_the_line_and_hides_it_at_once() {
        let mut machine = RevealMachine::new();
        let t0 = Instant::now();

        let mut blocked = tick_at(t0);
        blocked.cursor_in_edge_zone = true;
        blocked.fullscreen = true;
        assert_eq!(machine.tick(blocked), Action::Nothing);
        assert!(!machine.is_shown());

        let mut inside = tick_at(t0);
        inside.cursor_in_edge_zone = true;
        let _ = machine.tick(inside);
        let _ = machine.tick(tick_at(t0 + EDGE_DWELL).tap_edge());
        assert!(machine.is_shown());

        let mut appears = tick_at(t0 + EDGE_DWELL + Duration::from_millis(50));
        appears.cursor_in_strip = true;
        appears.fullscreen = true;
        assert_eq!(machine.tick(appears), Action::Hide);
        assert!(!machine.is_shown());
    }

    #[test]
    fn hiding_with_the_shortcut_disarms_the_edge_until_the_cursor_leaves() {
        let mut machine = RevealMachine::new();
        let t0 = Instant::now();

        let mut inside = tick_at(t0);
        inside.cursor_in_edge_zone = true;
        let _ = machine.tick(inside);
        let _ = machine.tick(tick_at(t0 + EDGE_DWELL).tap_edge());
        assert!(machine.is_shown());

        // Ocultar con el atajo mientras el cursor sigue en el borde.
        assert_eq!(machine.toggle(false), Action::Hide);
        assert!(!machine.is_shown());

        // La zona del borde desarmada no vuelve a mostrar la línea.
        let mut still_on_edge = tick_at(t0 + EDGE_DWELL + Duration::from_millis(400));
        still_on_edge.cursor_in_edge_zone = true;
        assert_eq!(machine.tick(still_on_edge), Action::Nothing);

        let mut later = tick_at(t0 + EDGE_DWELL + Duration::from_millis(1_000));
        later.cursor_in_edge_zone = true;
        assert_eq!(machine.tick(later), Action::Nothing);

        // El cursor abandona el borde y vuelve: la zona se rearma.
        assert_eq!(
            machine.tick(tick_at(t0 + EDGE_DWELL + Duration::from_millis(1_100))),
            Action::Nothing
        );
        let mut back = tick_at(t0 + EDGE_DWELL + Duration::from_millis(1_300));
        back.cursor_in_edge_zone = true;
        assert_eq!(machine.tick(back), Action::Nothing);
        let mut dwell = tick_at(t0 + EDGE_DWELL + Duration::from_millis(1_450));
        dwell.cursor_in_edge_zone = true;
        assert_eq!(machine.tick(dwell), Action::Show);
    }

    impl Tick {
        fn tap_edge(mut self) -> Tick {
            self.cursor_in_edge_zone = true;
            self
        }
    }
}
