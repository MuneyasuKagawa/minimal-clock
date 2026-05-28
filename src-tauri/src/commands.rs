use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::desktop_runtime::{
    self, compute_initial_position, should_open_settings, ClockWindowState,
    ClockWindowVisibilityPayload, DesktopError, RuntimeState, SettingsChangedPayload,
    CLOCK_WINDOW_LABEL, SETTINGS_CHANGED_EVENT, SETTINGS_WINDOW_LABEL, VISIBILITY_EVENT,
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
        let guard = state.lock().map_err(|_| DesktopError {
            kind: "runtime-failure".to_string(),
            operation: "initialize_clock_window".to_string(),
            message: "failed to acquire runtime state lock".to_string(),
        })?;

        if guard.window_state != ClockWindowState::HiddenUntilInitialized {
            return Err(DesktopError {
                kind: "runtime-failure".to_string(),
                operation: "initialize_clock_window".to_string(),
                message: "clock window already initialized".to_string(),
            });
        }

        (
            guard.settings.always_on_top,
            guard.settings.clone(),
            guard.persistence.clone(),
        )
    };

    // Compute position from primary monitor screen dimensions.
    // Note: monitor.size() returns the full screen size, not the OS work area
    // (Tauri v2 does not expose a work area API). PLACEMENT_MARGIN provides
    // partial compensation for taskbar overlap.
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

    let (x, y) = compute_initial_position(screen_x, screen_y, screen_width);

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
