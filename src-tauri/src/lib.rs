mod commands;
mod desktop_runtime;
#[cfg(test)]
mod host_config_tests;
pub mod settings_store;

use commands::{initialize_clock_window, native_runtime_capabilities};

pub fn run() {
    tauri::Builder::default()
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
            initialize_clock_window
        ])
        .run(tauri::generate_context!())
        .expect("failed to run minimal-clock desktop runtime");
}
