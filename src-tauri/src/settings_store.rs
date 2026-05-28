use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tauri::Runtime;

pub const SETTINGS_STORE_FILE_NAME: &str = "clock-settings.json";
pub const CLOCK_SETTINGS_KEY: &str = "clockSettings";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ClockMode {
    Digital,
    Analog,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClockSettings {
    pub mode: ClockMode,
    pub show_seconds: bool,
    pub hour24: bool,
    pub show_date: bool,
    pub always_on_top: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SettingsDefaultReason {
    Missing,
    Invalid,
    Unavailable,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SettingsLoadResult {
    Loaded {
        settings: ClockSettings,
    },
    Defaulted {
        settings: ClockSettings,
        reason: SettingsDefaultReason,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SettingsError {
    Unavailable,
}

pub trait SettingsBackend {
    fn read_settings_value(&self) -> Result<Option<Value>, SettingsError>;
    fn write_settings_value(&self, value: Value) -> Result<(), SettingsError>;
}

pub trait SettingsStore {
    fn load_settings(&self) -> Result<SettingsLoadResult, SettingsError>;
    fn save_settings(&self, settings: ClockSettings) -> Result<ClockSettings, SettingsError>;
}

#[derive(Debug)]
pub struct PersistentSettingsStore<B> {
    backend: B,
}

impl<B> PersistentSettingsStore<B> {
    pub fn new(backend: B) -> Self {
        Self { backend }
    }
}

impl<B> SettingsStore for PersistentSettingsStore<B>
where
    B: SettingsBackend,
{
    fn load_settings(&self) -> Result<SettingsLoadResult, SettingsError> {
        let value = match self.backend.read_settings_value() {
            Ok(value) => value,
            Err(SettingsError::Unavailable) => {
                return Ok(SettingsLoadResult::Defaulted {
                    settings: default_clock_settings(),
                    reason: SettingsDefaultReason::Unavailable,
                });
            }
        };

        let Some(value) = value else {
            return Ok(SettingsLoadResult::Defaulted {
                settings: default_clock_settings(),
                reason: SettingsDefaultReason::Missing,
            });
        };

        Ok(match validate_clock_settings(value) {
            Some(settings) => SettingsLoadResult::Loaded { settings },
            None => SettingsLoadResult::Defaulted {
                settings: default_clock_settings(),
                reason: SettingsDefaultReason::Invalid,
            },
        })
    }

    fn save_settings(&self, settings: ClockSettings) -> Result<ClockSettings, SettingsError> {
        let value = serde_json::to_value(&settings).map_err(|_| SettingsError::Unavailable)?;
        self.backend.write_settings_value(value)?;
        Ok(settings)
    }
}

pub struct TauriStoreBackend<R: Runtime> {
    store: Arc<tauri_plugin_store::Store<R>>,
}

impl<R: Runtime> TauriStoreBackend<R> {
    pub fn new(store: Arc<tauri_plugin_store::Store<R>>) -> Self {
        Self { store }
    }
}

impl<R: Runtime> SettingsBackend for TauriStoreBackend<R> {
    fn read_settings_value(&self) -> Result<Option<Value>, SettingsError> {
        Ok(self.store.get(CLOCK_SETTINGS_KEY))
    }

    fn write_settings_value(&self, value: Value) -> Result<(), SettingsError> {
        self.store.set(CLOCK_SETTINGS_KEY, value);
        self.store.save().map_err(|_| SettingsError::Unavailable)
    }
}

pub fn default_clock_settings() -> ClockSettings {
    ClockSettings {
        mode: ClockMode::Digital,
        show_seconds: true,
        hour24: true,
        show_date: false,
        always_on_top: true,
    }
}

pub fn validate_clock_settings(value: Value) -> Option<ClockSettings> {
    let object = value.as_object()?;
    let expected_keys = ["mode", "showSeconds", "hour24", "showDate", "alwaysOnTop"];

    if object.len() != expected_keys.len()
        || !expected_keys.iter().all(|key| object.contains_key(*key))
    {
        return None;
    }

    serde_json::from_value(value).ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    #[derive(Debug)]
    struct FakeBackend {
        value: RefCell<Result<Option<Value>, SettingsError>>,
        saved: RefCell<Option<Value>>,
        save_result: RefCell<Result<(), SettingsError>>,
    }

    impl FakeBackend {
        fn with_value(value: Option<Value>) -> Self {
            Self {
                value: RefCell::new(Ok(value)),
                saved: RefCell::new(None),
                save_result: RefCell::new(Ok(())),
            }
        }

        fn unavailable() -> Self {
            Self {
                value: RefCell::new(Err(SettingsError::Unavailable)),
                saved: RefCell::new(None),
                save_result: RefCell::new(Ok(())),
            }
        }
    }

    impl SettingsBackend for FakeBackend {
        fn read_settings_value(&self) -> Result<Option<Value>, SettingsError> {
            self.value.borrow().clone()
        }

        fn write_settings_value(&self, value: Value) -> Result<(), SettingsError> {
            *self.saved.borrow_mut() = Some(value);
            self.save_result.borrow().clone()
        }
    }

    fn analog_settings() -> ClockSettings {
        ClockSettings {
            mode: ClockMode::Analog,
            show_seconds: false,
            hour24: false,
            show_date: true,
            always_on_top: false,
        }
    }

    #[test]
    fn default_settings_match_initial_clock_display() {
        assert_eq!(
            default_clock_settings(),
            ClockSettings {
                mode: ClockMode::Digital,
                show_seconds: true,
                hour24: true,
                show_date: false,
                always_on_top: true,
            }
        );
    }

    #[test]
    fn missing_saved_settings_default_to_initial_display() {
        let store = PersistentSettingsStore::new(FakeBackend::with_value(None));

        assert_eq!(
            store.load_settings(),
            Ok(SettingsLoadResult::Defaulted {
                settings: default_clock_settings(),
                reason: SettingsDefaultReason::Missing,
            })
        );
    }

    #[test]
    fn complete_saved_settings_are_loaded_as_cold_start_candidate() {
        let settings = analog_settings();
        let store = PersistentSettingsStore::new(FakeBackend::with_value(Some(
            serde_json::to_value(&settings).unwrap(),
        )));

        assert_eq!(
            store.load_settings(),
            Ok(SettingsLoadResult::Loaded { settings })
        );
    }

    #[test]
    fn invalid_saved_settings_default_without_failing_startup() {
        let store =
            PersistentSettingsStore::new(FakeBackend::with_value(Some(serde_json::json!({
                "mode": "compact",
                "showSeconds": true,
                "hour24": true,
                "showDate": false,
                "alwaysOnTop": true
            }))));

        assert_eq!(
            store.load_settings(),
            Ok(SettingsLoadResult::Defaulted {
                settings: default_clock_settings(),
                reason: SettingsDefaultReason::Invalid,
            })
        );
    }

    #[test]
    fn unavailable_storage_defaults_without_failing_startup() {
        let store = PersistentSettingsStore::new(FakeBackend::unavailable());

        assert_eq!(
            store.load_settings(),
            Ok(SettingsLoadResult::Defaulted {
                settings: default_clock_settings(),
                reason: SettingsDefaultReason::Unavailable,
            })
        );
    }

    #[test]
    fn saved_settings_are_returned_and_can_be_loaded_again() {
        let backend = FakeBackend::with_value(None);
        let store = PersistentSettingsStore::new(backend);
        let settings = analog_settings();

        assert_eq!(store.save_settings(settings.clone()), Ok(settings.clone()));
        assert_eq!(
            store.backend.saved.borrow().as_ref(),
            Some(&serde_json::to_value(settings).unwrap())
        );
    }

    #[test]
    fn save_failure_is_returned_without_a_saved_candidate() {
        let backend = FakeBackend::with_value(None);
        *backend.save_result.borrow_mut() = Err(SettingsError::Unavailable);
        let store = PersistentSettingsStore::new(backend);

        assert_eq!(
            store.save_settings(analog_settings()),
            Err(SettingsError::Unavailable)
        );
    }
}
