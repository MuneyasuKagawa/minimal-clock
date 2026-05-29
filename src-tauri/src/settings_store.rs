use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tauri::Runtime;

pub const SETTINGS_STORE_FILE_NAME: &str = "clock-settings.json";
pub const CLOCK_SETTINGS_KEY: &str = "clockSettings";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ClockStyle {
    #[serde(rename = "digital")]
    Digital,
    #[serde(rename = "analog-simple")]
    AnalogSimple,
    #[serde(rename = "analog-numbers")]
    AnalogNumbers,
    #[serde(rename = "analog-markers")]
    AnalogMarkers,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DatePattern {
    Ymd,
    Md,
    Japanese,
    MdWeekday,
    Dmy,
}

impl Default for DatePattern {
    fn default() -> Self {
        DatePattern::Ymd
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DateSeparator {
    #[serde(rename = "/")]
    Slash,
    #[serde(rename = ".")]
    Dot,
    #[serde(rename = "-")]
    Dash,
}

impl Default for DateSeparator {
    fn default() -> Self {
        DateSeparator::Slash
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DatePosition {
    Top,
    TopRight,
    Right,
    BottomRight,
    Bottom,
    BottomLeft,
    Left,
    TopLeft,
}

impl Default for DatePosition {
    fn default() -> Self {
        DatePosition::Bottom
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClockSettings {
    pub clock_style: ClockStyle,
    #[serde(default = "default_clock_size")]
    pub clock_size: u32,
    #[serde(default = "default_font_weight")]
    pub font_weight: u32,
    #[serde(default = "default_letter_spacing")]
    pub letter_spacing: u32,
    pub show_seconds: bool,
    pub hour24: bool,
    pub show_date: bool,
    #[serde(default)]
    pub date_pattern: DatePattern,
    #[serde(default)]
    pub date_separator: DateSeparator,
    #[serde(default)]
    pub date_position: DatePosition,
    #[serde(default = "default_date_size")]
    pub date_size: u32,
    #[serde(default = "default_date_font_weight")]
    pub date_font_weight: u32,
    #[serde(default = "default_date_letter_spacing")]
    pub date_letter_spacing: u32,
    #[serde(default)]
    pub blink_colon: bool,
    #[serde(default = "default_show_border")]
    pub show_border: bool,
    #[serde(default = "default_show_border")]
    pub show_clock_face: bool,
    #[serde(default = "default_bg_color")]
    pub bg_color: String,
    #[serde(default = "default_opacity")]
    pub bg_opacity: u32,
    #[serde(default = "default_opacity")]
    pub clock_opacity: u32,
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

fn default_show_border() -> bool {
    true
}

fn default_font_weight() -> u32 {
    300
}

fn default_letter_spacing() -> u32 {
    8
}

fn default_date_size() -> u32 {
    10
}

fn default_date_font_weight() -> u32 {
    300
}

fn default_date_letter_spacing() -> u32 {
    8
}

fn default_opacity() -> u32 {
    100
}

fn default_bg_color() -> String {
    "#181820".to_string()
}

fn default_clock_size() -> u32 {
    16
}

pub fn default_clock_settings() -> ClockSettings {
    ClockSettings {
        clock_style: ClockStyle::Digital,
        clock_size: default_clock_size(),
        font_weight: default_font_weight(),
        letter_spacing: default_letter_spacing(),
        show_seconds: true,
        hour24: true,
        show_date: false,
        date_pattern: DatePattern::Ymd,
        date_separator: DateSeparator::Slash,
        date_position: DatePosition::Bottom,
        date_size: default_date_size(),
        date_font_weight: default_date_font_weight(),
        date_letter_spacing: default_date_letter_spacing(),
        blink_colon: false,
        show_border: true,
        show_clock_face: true,
        bg_color: default_bg_color(),
        bg_opacity: default_opacity(),
        clock_opacity: default_opacity(),
        always_on_top: true,
    }
}

pub fn validate_clock_settings(value: Value) -> Option<ClockSettings> {
    let object = value.as_object()?;
    let required_keys = ["clockStyle", "showSeconds", "hour24", "showDate", "alwaysOnTop"];

    if !required_keys.iter().all(|key| object.contains_key(*key)) {
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
            clock_style: ClockStyle::AnalogSimple,
            show_seconds: false,
            hour24: false,
            show_date: true,
            always_on_top: false,
            ..default_clock_settings()
        }
    }

    #[test]
    fn default_settings_match_initial_clock_display() {
        let defaults = default_clock_settings();
        assert_eq!(defaults.clock_style, ClockStyle::Digital);
        assert!(defaults.show_seconds);
        assert!(defaults.hour24);
        assert!(!defaults.show_date);
        assert!(defaults.always_on_top);
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
