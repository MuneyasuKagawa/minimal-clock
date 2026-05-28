use std::sync::Mutex;

use serde::Serialize;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, Emitter, Manager, Result};
use tauri_plugin_store::StoreExt;

use crate::settings_store::{
    default_clock_settings, ClockSettings, PersistentSettingsStore, SettingsLoadResult,
    SettingsStore, TauriStoreBackend, SETTINGS_STORE_FILE_NAME,
};

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
        SettingsLoadResult::Defaulted { settings, .. } => (settings, "volatile".to_string()),
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
    let restore = MenuItem::with_id(app, RESTORE_CLOCK_ID, "時計を表示", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, OPEN_SETTINGS_ID, "設定", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_APPLICATION_ID, "終了", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&restore, &settings, &quit])?;

    TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            QUIT_APPLICATION_ID => app.exit(0),
            RESTORE_CLOCK_ID | OPEN_SETTINGS_ID => {}
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
            api.prevent_close();

            let state = app_handle.state::<RuntimeState>();
            let mut guard = state.lock().expect("runtime state lock poisoned");

            if guard.window_state == ClockWindowState::Exiting {
                return;
            }

            guard.window_state = ClockWindowState::HiddenToTray;
            drop(guard);

            if let Some(window) = app_handle.get_webview_window(CLOCK_WINDOW_LABEL) {
                let _ = window.hide();
            }

            let _ = app_handle.emit_to(
                CLOCK_WINDOW_LABEL,
                VISIBILITY_EVENT,
                ClockWindowVisibilityPayload { visible: false },
            );
        }
    });

    Ok(())
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
    use crate::settings_store::{ClockMode, ClockSettings, SettingsDefaultReason};

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
            mode: ClockMode::Analog,
            show_seconds: false,
            hour24: false,
            show_date: true,
            always_on_top: false,
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
        assert_eq!(json["settings"]["mode"], "digital");
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
}
