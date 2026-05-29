use std::sync::Mutex;

use serde::Serialize;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, Emitter, Manager, Result};
use tauri_plugin_store::StoreExt;

use serde::Deserialize;

use crate::settings_store::{
    default_clock_settings, ClockSettings, PersistentSettingsStore, SettingsLoadResult,
    SettingsStore, TauriStoreBackend, SETTINGS_STORE_FILE_NAME,
};

const WINDOW_POSITION_KEY: &str = "windowPosition";

const RESTORE_CLOCK_ID: &str = "restore-clock";
const OPEN_SETTINGS_ID: &str = "open-settings";
const QUIT_APPLICATION_ID: &str = "quit-application";

pub const CLOCK_WINDOW_LABEL: &str = "main";
pub const SETTINGS_WINDOW_LABEL: &str = "settings";

pub const SETTINGS_CHANGED_EVENT: &str = "clock-settings://changed";
pub const VISIBILITY_EVENT: &str = "clock-window://visibility";

const FALLBACK_X: f64 = 100.0;
const FALLBACK_Y: f64 = 100.0;
const PLACEMENT_MARGIN: f64 = 24.0;
const CLOCK_WINDOW_WIDTH: f64 = 220.0;

// --- State types ---

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClockWindowState {
    HiddenUntilInitialized,
    Visible,
    HiddenToTray,
    Exiting,
}

#[derive(Debug)]
pub struct AppliedState {
    pub settings: ClockSettings,
    pub persistence: String,
    pub window_state: ClockWindowState,
}

pub type RuntimeState = Mutex<AppliedState>;

// --- Payloads ---

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SettingsChangedPayload {
    pub settings: ClockSettings,
    pub persistence: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ClockWindowVisibilityPayload {
    pub visible: bool,
}

// --- Error ---

#[derive(Debug, Clone, Serialize)]
pub struct DesktopError {
    pub kind: String,
    pub operation: String,
    pub message: String,
}

impl std::fmt::Display for DesktopError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {} ({})", self.kind, self.message, self.operation)
    }
}

// --- Tray action results (pure, testable) ---

/// Result of evaluating a restore-clock action against current state.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RestoreClockResult {
    /// Clock window should be shown and state transitions to Visible.
    Restored {
        payload: SettingsChangedPayload,
    },
    /// Restore is a no-op because the clock is already visible or exiting.
    NoOp,
}

/// Evaluates whether restore-clock should proceed and returns the outcome.
/// Does NOT mutate state — caller applies the transition.
pub fn resolve_restore_clock(state: &AppliedState) -> RestoreClockResult {
    match state.window_state {
        ClockWindowState::HiddenToTray | ClockWindowState::HiddenUntilInitialized => {
            RestoreClockResult::Restored {
                payload: SettingsChangedPayload {
                    settings: state.settings.clone(),
                    persistence: state.persistence.clone(),
                },
            }
        }
        ClockWindowState::Visible | ClockWindowState::Exiting => RestoreClockResult::NoOp,
    }
}

/// Result of evaluating a quit action against current state.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum QuitResult {
    /// App should exit — state transitions to Exiting.
    Exit,
    /// Already exiting — no-op.
    AlreadyExiting,
}

/// Evaluates whether quit should proceed.
pub fn resolve_quit(state: &AppliedState) -> QuitResult {
    match state.window_state {
        ClockWindowState::Exiting => QuitResult::AlreadyExiting,
        _ => QuitResult::Exit,
    }
}

/// Returns true if the settings window open request should be serviced.
/// Blocked only when the app is exiting.
pub fn should_open_settings(state: &AppliedState) -> bool {
    state.window_state != ClockWindowState::Exiting
}

// --- Window position persistence ---

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SavedPosition {
    x: f64,
    y: f64,
}

pub fn save_window_position(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window(CLOCK_WINDOW_LABEL) else { return };
    let Ok(pos) = window.outer_position() else { return };
    let Ok(store) = app.store(SETTINGS_STORE_FILE_NAME) else { return };
    let scale = window.scale_factor().unwrap_or(1.0);
    let saved = SavedPosition { x: pos.x as f64 / scale, y: pos.y as f64 / scale };
    store.set(WINDOW_POSITION_KEY, serde_json::to_value(&saved).unwrap_or_default());
    let _ = store.save();
}

pub fn load_saved_position(app: &tauri::AppHandle) -> Option<(f64, f64)> {
    let store = app.store(SETTINGS_STORE_FILE_NAME).ok()?;
    let value = store.get(WINDOW_POSITION_KEY)?;
    let saved: SavedPosition = serde_json::from_value(value).ok()?;
    Some((saved.x, saved.y))
}

// --- Pure logic ---

pub fn compute_initial_position(
    screen_x: Option<f64>,
    screen_y: Option<f64>,
    screen_width: Option<f64>,
) -> (f64, f64) {
    match (screen_x, screen_y, screen_width) {
        (Some(sx), Some(sy), Some(sw)) => {
            let x = sx + sw - CLOCK_WINDOW_WIDTH - PLACEMENT_MARGIN;
            let y = sy + PLACEMENT_MARGIN;
            (x, y)
        }
        _ => (FALLBACK_X, FALLBACK_Y),
    }
}

/// Initializes the AppliedState from a SettingsLoadResult.
/// Returns the initial state and the persistence string.
pub fn init_applied_state(load_result: SettingsLoadResult) -> AppliedState {
    let (settings, persistence) = match load_result {
        SettingsLoadResult::Loaded { settings } => (settings, "saved".to_string()),
        SettingsLoadResult::Defaulted { settings, .. } => (settings, "saved".to_string()),
    };

    AppliedState {
        settings,
        persistence,
        window_state: ClockWindowState::HiddenUntilInitialized,
    }
}

// --- Public functions ---

pub fn native_operation_ids() -> &'static [&'static str] {
    &[RESTORE_CLOCK_ID, OPEN_SETTINGS_ID, QUIT_APPLICATION_ID]
}

#[cfg(test)]
pub fn settings_store_file_name() -> &'static str {
    SETTINGS_STORE_FILE_NAME
}

pub fn create_initial_runtime_state() -> RuntimeState {
    Mutex::new(AppliedState {
        settings: default_clock_settings(),
        persistence: "volatile".to_string(),
        window_state: ClockWindowState::HiddenUntilInitialized,
    })
}

pub fn register_tray(app: &mut App) -> Result<()> {
    let settings = MenuItem::with_id(app, OPEN_SETTINGS_ID, "設定", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_APPLICATION_ID, "終了", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings, &quit])?;

    TrayIconBuilder::with_id("main-tray")
        .icon(tauri::image::Image::from_bytes(include_bytes!("../icons/tray.png"))
            .expect("failed to load tray icon"))
        .tooltip("Minimal Clock")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            RESTORE_CLOCK_ID => {
                handle_tray_restore(app);
            }
            OPEN_SETTINGS_ID => {
                handle_tray_open_settings(app);
            }
            QUIT_APPLICATION_ID => {
                handle_tray_quit(app);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

/// Registers the close-to-hide handler on the main clock window.
/// When the user presses Alt+F4 or clicks close, the window is hidden
/// instead of destroyed, and a visibility event is emitted.
pub fn register_close_to_hide(app: &mut App) -> Result<()> {
    let main_window = app
        .get_webview_window(CLOCK_WINDOW_LABEL)
        .ok_or_else(|| tauri::Error::WindowNotFound)?;

    let app_handle = app.handle().clone();

    main_window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            let state = app_handle.state::<RuntimeState>();
            let guard = state.lock().expect("runtime state lock poisoned");
            if guard.window_state != ClockWindowState::Exiting {
                api.prevent_close();
            }
        }
    });

    Ok(())
}

// --- Tray event handlers ---

fn handle_tray_restore(app: &tauri::AppHandle) {
    let state = app.state::<RuntimeState>();
    let restore_result = {
        let guard = state.lock().expect("runtime state lock poisoned");
        resolve_restore_clock(&guard)
    };

    match restore_result {
        RestoreClockResult::Restored { payload } => {
            // Update state to Visible
            {
                let mut guard = state.lock().expect("runtime state lock poisoned");
                guard.window_state = ClockWindowState::Visible;
            }

            // Show and focus the main window
            if let Some(window) = app.get_webview_window(CLOCK_WINDOW_LABEL) {
                let _ = window.show();
                let _ = window.set_focus();
            }

            // Emit visibility event
            let _ = app.emit_to(
                CLOCK_WINDOW_LABEL,
                VISIBILITY_EVENT,
                ClockWindowVisibilityPayload { visible: true },
            );

            // Emit settings changed so clock can resync
            let _ = app.emit_to(CLOCK_WINDOW_LABEL, SETTINGS_CHANGED_EVENT, &payload);
            let _ = app.emit_to(SETTINGS_WINDOW_LABEL, SETTINGS_CHANGED_EVENT, &payload);
        }
        RestoreClockResult::NoOp => {}
    }
}

fn handle_tray_open_settings(app: &tauri::AppHandle) {
    let state = app.state::<RuntimeState>();
    let allowed = {
        let guard = state.lock().expect("runtime state lock poisoned");
        should_open_settings(&guard)
    };

    if !allowed {
        return;
    }

    show_or_focus_settings_window(app);
}

fn handle_tray_quit(app: &tauri::AppHandle) {
    let state = app.state::<RuntimeState>();
    let result = {
        let guard = state.lock().expect("runtime state lock poisoned");
        resolve_quit(&guard)
    };

    match result {
        QuitResult::Exit => {
            {
                let mut guard = state.lock().expect("runtime state lock poisoned");
                guard.window_state = ClockWindowState::Exiting;
            }
            app.exit(0);
        }
        QuitResult::AlreadyExiting => {}
    }
}

// --- Shared window helpers ---

/// Shows the settings window if it exists, focusing it if already visible.
/// Creates no new windows — the settings window is defined in tauri.conf.json
/// and created at startup in a hidden state.
pub fn show_or_focus_settings_window(app: &tauri::AppHandle) {
    let Some(settings_window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) else { return };

    if settings_window.is_visible().unwrap_or(false) {
        let _ = settings_window.set_focus();
        return;
    }

    if let Some(clock_window) = app.get_webview_window(CLOCK_WINDOW_LABEL) {
        if let (Ok(clock_pos), Ok(settings_size)) =
            (clock_window.outer_position(), settings_window.outer_size())
        {
            let scale = clock_window.scale_factor().unwrap_or(1.0);
            let sw = settings_size.width as f64 / scale;
            let sh = settings_size.height as f64 / scale;

            let mut x = clock_pos.x as f64 / scale;
            let mut y = clock_pos.y as f64 / scale + 50.0;

            if let Some(monitor) = app.primary_monitor().ok().flatten() {
                let mon_w = monitor.size().width as f64 / scale;
                let mon_h = monitor.size().height as f64 / scale;

                if x + sw > mon_w {
                    x = mon_w - sw - 8.0;
                }
                if x < 0.0 {
                    x = 8.0;
                }
                if y + sh > mon_h {
                    y = clock_pos.y as f64 / scale - sh - 8.0;
                }
                if y < 0.0 {
                    y = 8.0;
                }
            }

            let _ = settings_window.set_position(tauri::LogicalPosition::new(x, y));
        }
    }

    let _ = settings_window.show();
    let _ = settings_window.set_focus();
}

/// Sets state to Exiting and exits the application.
pub fn exit_application(app: &tauri::AppHandle) {
    save_window_position(app);
    let state = app.state::<RuntimeState>();
    {
        let mut guard = state.lock().expect("runtime state lock poisoned");
        guard.window_state = ClockWindowState::Exiting;
    }
    app.exit(0);
}

/// Loads settings from the store and initializes the runtime applied state.
/// Called during app setup before the clock window is shown.
pub fn initialize_applied_state(app: &App) -> Result<()> {
    let load_result = match app.store(SETTINGS_STORE_FILE_NAME) {
        Ok(store) => {
            let backend = TauriStoreBackend::new(store);
            let settings_store = PersistentSettingsStore::new(backend);
            settings_store
                .load_settings()
                .unwrap_or(SettingsLoadResult::Defaulted {
                    settings: default_clock_settings(),
                    reason: crate::settings_store::SettingsDefaultReason::Unavailable,
                })
        }
        Err(_) => SettingsLoadResult::Defaulted {
            settings: default_clock_settings(),
            reason: crate::settings_store::SettingsDefaultReason::Unavailable,
        },
    };

    let initial_state = init_applied_state(load_result);

    let state = app.state::<RuntimeState>();
    let mut guard = state.lock().expect("runtime state lock poisoned");
    *guard = initial_state;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings_store::{ClockStyle, ClockSettings, SettingsDefaultReason};

    // --- compute_initial_position tests ---

    #[test]
    fn position_is_top_right_of_screen_with_margin() {
        let (x, y) = compute_initial_position(Some(0.0), Some(0.0), Some(1920.0));

        assert_eq!(x, 1920.0 - CLOCK_WINDOW_WIDTH - PLACEMENT_MARGIN);
        assert_eq!(y, PLACEMENT_MARGIN);
    }

    #[test]
    fn position_accounts_for_screen_offset() {
        let (x, y) = compute_initial_position(Some(100.0), Some(50.0), Some(1820.0));

        assert_eq!(x, 100.0 + 1820.0 - CLOCK_WINDOW_WIDTH - PLACEMENT_MARGIN);
        assert_eq!(y, 50.0 + PLACEMENT_MARGIN);
    }

    #[test]
    fn position_falls_back_when_screen_x_is_missing() {
        let (x, y) = compute_initial_position(None, Some(0.0), Some(1920.0));

        assert_eq!(x, FALLBACK_X);
        assert_eq!(y, FALLBACK_Y);
    }

    #[test]
    fn position_falls_back_when_screen_y_is_missing() {
        let (x, y) = compute_initial_position(Some(0.0), None, Some(1920.0));

        assert_eq!(x, FALLBACK_X);
        assert_eq!(y, FALLBACK_Y);
    }

    #[test]
    fn position_falls_back_when_screen_width_is_missing() {
        let (x, y) = compute_initial_position(Some(0.0), Some(0.0), None);

        assert_eq!(x, FALLBACK_X);
        assert_eq!(y, FALLBACK_Y);
    }

    #[test]
    fn position_falls_back_when_all_dimensions_are_missing() {
        let (x, y) = compute_initial_position(None, None, None);

        assert_eq!(x, FALLBACK_X);
        assert_eq!(y, FALLBACK_Y);
    }

    // --- init_applied_state tests ---

    #[test]
    fn loaded_settings_produce_saved_persistence() {
        let settings = ClockSettings {
            clock_style: ClockStyle::AnalogSimple,
            show_seconds: false,
            hour24: false,
            show_date: true,
            always_on_top: false,
            ..default_clock_settings()
        };
        let load_result = SettingsLoadResult::Loaded {
            settings: settings.clone(),
        };

        let state = init_applied_state(load_result);

        assert_eq!(state.settings, settings);
        assert_eq!(state.persistence, "saved");
        assert_eq!(state.window_state, ClockWindowState::HiddenUntilInitialized);
    }

    #[test]
    fn defaulted_settings_produce_volatile_persistence() {
        let settings = default_clock_settings();
        let load_result = SettingsLoadResult::Defaulted {
            settings: settings.clone(),
            reason: SettingsDefaultReason::Missing,
        };

        let state = init_applied_state(load_result);

        assert_eq!(state.settings, settings);
        assert_eq!(state.persistence, "volatile");
        assert_eq!(state.window_state, ClockWindowState::HiddenUntilInitialized);
    }

    #[test]
    fn defaulted_due_to_unavailable_produces_volatile() {
        let load_result = SettingsLoadResult::Defaulted {
            settings: default_clock_settings(),
            reason: SettingsDefaultReason::Unavailable,
        };

        let state = init_applied_state(load_result);

        assert_eq!(state.persistence, "volatile");
        assert_eq!(state.window_state, ClockWindowState::HiddenUntilInitialized);
    }

    #[test]
    fn defaulted_due_to_invalid_produces_volatile() {
        let load_result = SettingsLoadResult::Defaulted {
            settings: default_clock_settings(),
            reason: SettingsDefaultReason::Invalid,
        };

        let state = init_applied_state(load_result);

        assert_eq!(state.persistence, "volatile");
        assert_eq!(state.window_state, ClockWindowState::HiddenUntilInitialized);
    }

    // --- ClockWindowState transition tests ---

    #[test]
    fn initial_window_state_is_hidden_until_initialized() {
        let state = init_applied_state(SettingsLoadResult::Loaded {
            settings: default_clock_settings(),
        });

        assert_eq!(state.window_state, ClockWindowState::HiddenUntilInitialized);
    }

    #[test]
    fn window_state_transitions_are_distinct() {
        assert_ne!(
            ClockWindowState::HiddenUntilInitialized,
            ClockWindowState::Visible
        );
        assert_ne!(
            ClockWindowState::Visible,
            ClockWindowState::HiddenToTray
        );
        assert_ne!(
            ClockWindowState::HiddenToTray,
            ClockWindowState::Exiting
        );
    }

    // --- Existing tests ---

    #[test]
    fn native_operation_ids_are_limited_to_tray_entry_points() {
        assert_eq!(
            native_operation_ids(),
            [RESTORE_CLOCK_ID, OPEN_SETTINGS_ID, QUIT_APPLICATION_ID]
        );
    }

    #[test]
    fn store_file_is_local_settings_snapshot() {
        assert_eq!(settings_store_file_name(), "clock-settings.json");
    }

    // --- create_initial_runtime_state tests ---

    #[test]
    fn initial_runtime_state_uses_defaults_and_volatile() {
        let state = create_initial_runtime_state();
        let guard = state.lock().unwrap();

        assert_eq!(guard.settings, default_clock_settings());
        assert_eq!(guard.persistence, "volatile");
        assert_eq!(guard.window_state, ClockWindowState::HiddenUntilInitialized);
    }

    // --- SettingsChangedPayload tests ---

    #[test]
    fn settings_changed_payload_serializes_correctly() {
        let payload = SettingsChangedPayload {
            settings: default_clock_settings(),
            persistence: "saved".to_string(),
        };
        let json = serde_json::to_value(&payload).unwrap();

        assert_eq!(json["persistence"], "saved");
        assert_eq!(json["settings"]["clockStyle"], "digital");
        assert_eq!(json["settings"]["showSeconds"], true);
        assert_eq!(json["settings"]["hour24"], true);
        assert_eq!(json["settings"]["showDate"], false);
        assert_eq!(json["settings"]["alwaysOnTop"], true);
    }

    #[test]
    fn visibility_payload_serializes_correctly() {
        let payload = ClockWindowVisibilityPayload { visible: false };
        let json = serde_json::to_value(&payload).unwrap();

        assert_eq!(json["visible"], false);
    }

    // --- resolve_restore_clock tests ---

    fn make_state(window_state: ClockWindowState) -> AppliedState {
        AppliedState {
            settings: default_clock_settings(),
            persistence: "saved".to_string(),
            window_state,
        }
    }

    #[test]
    fn restore_from_hidden_to_tray_produces_restored_with_settings_payload() {
        let state = make_state(ClockWindowState::HiddenToTray);

        let result = resolve_restore_clock(&state);

        assert_eq!(
            result,
            RestoreClockResult::Restored {
                payload: SettingsChangedPayload {
                    settings: default_clock_settings(),
                    persistence: "saved".to_string(),
                },
            }
        );
    }

    #[test]
    fn restore_from_hidden_until_initialized_produces_restored() {
        let state = make_state(ClockWindowState::HiddenUntilInitialized);

        let result = resolve_restore_clock(&state);

        assert!(matches!(result, RestoreClockResult::Restored { .. }));
    }

    #[test]
    fn restore_when_already_visible_is_noop() {
        let state = make_state(ClockWindowState::Visible);

        let result = resolve_restore_clock(&state);

        assert_eq!(result, RestoreClockResult::NoOp);
    }

    #[test]
    fn restore_when_exiting_is_noop() {
        let state = make_state(ClockWindowState::Exiting);

        let result = resolve_restore_clock(&state);

        assert_eq!(result, RestoreClockResult::NoOp);
    }

    #[test]
    fn restore_payload_carries_volatile_persistence_when_state_is_volatile() {
        let state = AppliedState {
            settings: default_clock_settings(),
            persistence: "volatile".to_string(),
            window_state: ClockWindowState::HiddenToTray,
        };

        let result = resolve_restore_clock(&state);

        match result {
            RestoreClockResult::Restored { payload } => {
                assert_eq!(payload.persistence, "volatile");
            }
            _ => panic!("expected Restored"),
        }
    }

    // --- resolve_quit tests ---

    #[test]
    fn quit_from_visible_produces_exit() {
        let state = make_state(ClockWindowState::Visible);

        assert_eq!(resolve_quit(&state), QuitResult::Exit);
    }

    #[test]
    fn quit_from_hidden_to_tray_produces_exit() {
        let state = make_state(ClockWindowState::HiddenToTray);

        assert_eq!(resolve_quit(&state), QuitResult::Exit);
    }

    #[test]
    fn quit_from_hidden_until_initialized_produces_exit() {
        let state = make_state(ClockWindowState::HiddenUntilInitialized);

        assert_eq!(resolve_quit(&state), QuitResult::Exit);
    }

    #[test]
    fn quit_when_already_exiting_is_already_exiting() {
        let state = make_state(ClockWindowState::Exiting);

        assert_eq!(resolve_quit(&state), QuitResult::AlreadyExiting);
    }

    // --- should_open_settings tests ---

    #[test]
    fn settings_allowed_when_visible() {
        let state = make_state(ClockWindowState::Visible);

        assert!(should_open_settings(&state));
    }

    #[test]
    fn settings_allowed_when_hidden_to_tray() {
        let state = make_state(ClockWindowState::HiddenToTray);

        assert!(should_open_settings(&state));
    }

    #[test]
    fn settings_allowed_when_hidden_until_initialized() {
        let state = make_state(ClockWindowState::HiddenUntilInitialized);

        assert!(should_open_settings(&state));
    }

    #[test]
    fn settings_blocked_when_exiting() {
        let state = make_state(ClockWindowState::Exiting);

        assert!(!should_open_settings(&state));
    }
}
