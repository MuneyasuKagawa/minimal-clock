use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_store::StoreExt;

use crate::desktop_runtime::{
    self, compute_initial_position, load_saved_position, should_open_settings, ClockWindowState,
    ClockWindowVisibilityPayload, DesktopError, RuntimeState, SettingsChangedPayload,
    CLOCK_WINDOW_LABEL, SETTINGS_CHANGED_EVENT, SETTINGS_WINDOW_LABEL, VISIBILITY_EVENT,
};
use crate::settings_store::{
    ClockSettings, PersistentSettingsStore, SettingsStore, TauriStoreBackend,
    SETTINGS_STORE_FILE_NAME,
};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NativeRuntimeCapabilities {
    pub tray_registered: bool,
    pub store_registered: bool,
    pub limited_native_operations: Vec<&'static str>,
}

#[tauri::command]
pub fn native_runtime_capabilities() -> NativeRuntimeCapabilities {
    NativeRuntimeCapabilities {
        tray_registered: true,
        store_registered: true,
        limited_native_operations: desktop_runtime::native_operation_ids().to_vec(),
    }
}

#[tauri::command]
pub fn initialize_clock_window(
    app: AppHandle,
    state: State<'_, RuntimeState>,
) -> Result<SettingsChangedPayload, DesktopError> {
    let main_window = app
        .get_webview_window(CLOCK_WINDOW_LABEL)
        .ok_or_else(|| DesktopError {
            kind: "window-unavailable".to_string(),
            operation: "initialize_clock_window".to_string(),
            message: "clock window not found".to_string(),
        })?;

    let (always_on_top, settings, persistence) = {
        let mut guard = state.lock().map_err(|_| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "initialize_clock_window".to_string(),
            message: "failed to acquire runtime state lock".to_string(),
        })?;

        // Load saved settings on first access. Guards the startup race where the
        // clock webview reaches this command before the setup hook has loaded
        // them — without this, the clock would boot with default settings.
        desktop_runtime::ensure_settings_loaded(&app, &mut guard);

        if guard.window_state != ClockWindowState::HiddenUntilInitialized {
            return Ok(SettingsChangedPayload {
                settings: guard.settings.clone(),
                persistence: guard.persistence.clone(),
            });
        }

        (
            guard.settings.always_on_top,
            guard.settings.clone(),
            guard.persistence.clone(),
        )
    };

    let (x, y) = if let Some((sx, sy)) = load_saved_position(&app) {
        (sx, sy)
    } else {
        let monitor_info = app.primary_monitor().ok().flatten();
        let (screen_x, screen_y, screen_width) = match monitor_info {
            Some(ref monitor) => {
                let position = monitor.position();
                let size = monitor.size();
                let scale = monitor.scale_factor();
                (
                    Some(position.x as f64),
                    Some(position.y as f64),
                    Some(size.width as f64 / scale),
                )
            }
            None => (None, None, None),
        };
        compute_initial_position(screen_x, screen_y, screen_width)
    };

    main_window
        .set_position(tauri::LogicalPosition::new(x, y))
        .map_err(|e| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "initialize_clock_window".to_string(),
            message: format!("failed to set position: {}", e),
        })?;

    main_window
        .set_always_on_top(always_on_top)
        .map_err(|e| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "initialize_clock_window".to_string(),
            message: format!("failed to set always on top: {}", e),
        })?;

    main_window.show().map_err(|e| DesktopError {
        kind: "runtime-failure".to_string(),
        operation: "initialize_clock_window".to_string(),
        message: format!("failed to show window: {}", e),
    })?;

    {
        let mut guard = state.lock().map_err(|_| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "initialize_clock_window".to_string(),
            message: "failed to re-acquire runtime state lock".to_string(),
        })?;
        guard.window_state = ClockWindowState::Visible;
    }

    let payload = SettingsChangedPayload {
        settings,
        persistence,
    };

    // Emit settings changed event to both windows
    let _ = app.emit_to(CLOCK_WINDOW_LABEL, SETTINGS_CHANGED_EVENT, &payload);
    let _ = app.emit_to(SETTINGS_WINDOW_LABEL, SETTINGS_CHANGED_EVENT, &payload);

    // Emit visibility event
    let _ = app.emit_to(
        CLOCK_WINDOW_LABEL,
        VISIBILITY_EVENT,
        ClockWindowVisibilityPayload { visible: true },
    );

    Ok(payload)
}

#[tauri::command]
pub fn open_settings_window(
    app: AppHandle,
    state: State<'_, RuntimeState>,
) -> Result<(), DesktopError> {
    let allowed = {
        let guard = state.lock().map_err(|_| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "open_settings_window".to_string(),
            message: "failed to acquire runtime state lock".to_string(),
        })?;
        should_open_settings(&guard)
    };

    if !allowed {
        return Err(DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "open_settings_window".to_string(),
            message: "application is exiting".to_string(),
        });
    }

    desktop_runtime::show_or_focus_settings_window(&app);

    Ok(())
}

#[tauri::command]
pub fn quit_application(app: AppHandle) {
    desktop_runtime::exit_application(&app);
}

#[tauri::command]
pub fn get_applied_settings(
    app: AppHandle,
    state: State<'_, RuntimeState>,
) -> Result<SettingsChangedPayload, DesktopError> {
    let mut guard = state.lock().map_err(|_| DesktopError {
        kind: "runtime-failure".to_string(),
        operation: "get_applied_settings".to_string(),
        message: "failed to acquire runtime state lock".to_string(),
    })?;

    // Load saved settings on first access — the settings window can reach this
    // command before the setup hook has loaded them at startup.
    desktop_runtime::ensure_settings_loaded(&app, &mut guard);

    Ok(SettingsChangedPayload {
        settings: guard.settings.clone(),
        persistence: guard.persistence.clone(),
    })
}

#[tauri::command]
pub fn apply_settings(
    app: AppHandle,
    state: State<'_, RuntimeState>,
    settings: ClockSettings,
) -> Result<SettingsChangedPayload, DesktopError> {
    let always_on_top_changed = {
        let guard = state.lock().map_err(|_| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "apply_settings".to_string(),
            message: "failed to acquire runtime state lock".to_string(),
        })?;
        settings.always_on_top != guard.settings.always_on_top
    };

    // If alwaysOnTop changed, apply native window state first
    if always_on_top_changed {
        if let Some(window) = app.get_webview_window(CLOCK_WINDOW_LABEL) {
            window
                .set_always_on_top(settings.always_on_top)
                .map_err(|e| DesktopError {
                    kind: "runtime-failure".to_string(),
                    operation: "apply_settings".to_string(),
                    message: format!("failed to set always on top: {}", e),
                })?;
        }
    }

    // Update applied state
    {
        let mut guard = state.lock().map_err(|_| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "apply_settings".to_string(),
            message: "failed to re-acquire runtime state lock".to_string(),
        })?;
        guard.settings = settings.clone();
    }

    // Attempt to save to store
    let persistence = match app.store(SETTINGS_STORE_FILE_NAME) {
        Ok(store) => {
            let backend = TauriStoreBackend::new(store);
            let settings_store = PersistentSettingsStore::new(backend);
            match settings_store.save_settings(settings.clone()) {
                Ok(_) => "saved".to_string(),
                Err(_) => "volatile".to_string(),
            }
        }
        Err(_) => "volatile".to_string(),
    };

    // Update persistence in state
    {
        let mut guard = state.lock().map_err(|_| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "apply_settings".to_string(),
            message: "failed to update persistence state".to_string(),
        })?;
        guard.persistence = persistence.clone();
    }

    let payload = SettingsChangedPayload {
        settings,
        persistence,
    };

    // Emit settings changed to both windows
    let _ = app.emit_to(CLOCK_WINDOW_LABEL, SETTINGS_CHANGED_EVENT, &payload);
    let _ = app.emit_to(SETTINGS_WINDOW_LABEL, SETTINGS_CHANGED_EVENT, &payload);

    Ok(payload)
}

#[tauri::command]
pub fn retry_settings_persistence(
    app: AppHandle,
    state: State<'_, RuntimeState>,
) -> Result<SettingsChangedPayload, DesktopError> {
    let settings = {
        let guard = state.lock().map_err(|_| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "retry_settings_persistence".to_string(),
            message: "failed to acquire runtime state lock".to_string(),
        })?;
        guard.settings.clone()
    };

    // Attempt to save to store
    let store = app.store(SETTINGS_STORE_FILE_NAME).map_err(|_| DesktopError {
        kind: "runtime-failure".to_string(),
        operation: "retry_settings_persistence".to_string(),
        message: "failed to access settings store".to_string(),
    })?;

    let backend = TauriStoreBackend::new(store);
    let settings_store = PersistentSettingsStore::new(backend);

    settings_store
        .save_settings(settings.clone())
        .map_err(|_| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "retry_settings_persistence".to_string(),
            message: "failed to persist settings".to_string(),
        })?;

    // Update persistence to saved
    {
        let mut guard = state.lock().map_err(|_| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "retry_settings_persistence".to_string(),
            message: "failed to update persistence state".to_string(),
        })?;
        guard.persistence = "saved".to_string();
    }

    let payload = SettingsChangedPayload {
        settings,
        persistence: "saved".to_string(),
    };

    // Emit settings changed to both windows
    let _ = app.emit_to(CLOCK_WINDOW_LABEL, SETTINGS_CHANGED_EVENT, &payload);
    let _ = app.emit_to(SETTINGS_WINDOW_LABEL, SETTINGS_CHANGED_EVENT, &payload);

    Ok(payload)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_registered_native_foundation() {
        let capabilities = native_runtime_capabilities();

        assert!(capabilities.tray_registered);
        assert!(capabilities.store_registered);
        assert_eq!(
            capabilities.limited_native_operations,
            ["restore-clock", "open-settings", "quit-application"]
        );
    }
}
