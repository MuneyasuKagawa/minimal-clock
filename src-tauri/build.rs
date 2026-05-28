fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&[
                "native_runtime_capabilities",
                "initialize_clock_window",
                "open_settings_window",
                "quit_application",
                "get_applied_settings",
                "apply_settings",
                "retry_settings_persistence",
            ]),
        ),
    )
    .expect("failed to build minimal-clock Tauri context");
}
