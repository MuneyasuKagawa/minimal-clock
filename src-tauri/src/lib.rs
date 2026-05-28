mod commands;
mod desktop_runtime;
#[cfg(test)]
mod host_config_tests;

use commands::native_runtime_capabilities;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            desktop_runtime::register_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![native_runtime_capabilities])
        .run(tauri::generate_context!())
        .expect("failed to run minimal-clock desktop runtime");
}
