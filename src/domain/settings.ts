export const CLOCK_MODES = ["digital", "analog"] as const;

export type ClockMode = (typeof CLOCK_MODES)[number];

export interface ClockSettings {
  mode: ClockMode;
  showSeconds: boolean;
  hour24: boolean;
  showDate: boolean;
  alwaysOnTop: boolean;
}

export const DEFAULT_CLOCK_SETTINGS: ClockSettings = {
  mode: "digital",
  showSeconds: true,
  hour24: true,
  showDate: false,
  alwaysOnTop: true
};

const CLOCK_SETTINGS_KEYS = [
  "mode",
  "showSeconds",
  "hour24",
  "showDate",
  "alwaysOnTop"
] as const satisfies readonly (keyof ClockSettings)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyClockSettingsKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);

  return (
    keys.length === CLOCK_SETTINGS_KEYS.length &&
    CLOCK_SETTINGS_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

export function isClockMode(value: unknown): value is ClockMode {
  return CLOCK_MODES.includes(value as ClockMode);
}

export function isClockSettings(value: unknown): value is ClockSettings {
  return (
    isRecord(value) &&
    hasOnlyClockSettingsKeys(value) &&
    isClockMode(value.mode) &&
    typeof value.showSeconds === "boolean" &&
    typeof value.hour24 === "boolean" &&
    typeof value.showDate === "boolean" &&
    typeof value.alwaysOnTop === "boolean"
  );
}
