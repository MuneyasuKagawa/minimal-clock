mod commands;
mod desktop_runtime;
#[cfg(test)]
mod host_config_tests;
pub mod settings_store;

use commands::{
    apply_settings, get_applied_settings, initialize_clock_window, native_runtime_capabilities,
    open_settings_window, quit_application, retry_settings_persistence,
};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(desktop_runtime::create_initial_runtime_state())
        .setup(|app| {
            desktop_runtime::initialize_applied_state(app)?;
            desktop_runtime::register_tray(app)?;
            desktop_runtime::register_close_to_hide(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            native_runtime_capabilities,
            initialize_clock_window,
            open_settings_window,
            quit_application,
            get_applied_settings,
            apply_settings,
            retry_settings_persistence
        ])
        .run(tauri::generate_context!())
        .expect("failed to run minimal-clock desktop runtime");
}
