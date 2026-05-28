use serde::Serialize;

use crate::desktop_runtime;

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

