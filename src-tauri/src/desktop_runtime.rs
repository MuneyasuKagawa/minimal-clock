use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, Result};

const RESTORE_CLOCK_ID: &str = "restore-clock";
const OPEN_SETTINGS_ID: &str = "open-settings";
const QUIT_APPLICATION_ID: &str = "quit-application";

pub fn native_operation_ids() -> &'static [&'static str] {
    &[RESTORE_CLOCK_ID, OPEN_SETTINGS_ID, QUIT_APPLICATION_ID]
}

#[cfg(test)]
pub fn settings_store_file_name() -> &'static str {
    "clock-settings.json"
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

#[cfg(test)]
mod tests {
    use super::*;

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
}
