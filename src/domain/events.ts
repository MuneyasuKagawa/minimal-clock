import { isClockSettings, type ClockSettings } from "./settings";

export const CLOCK_SETTINGS_CHANGED_EVENT = "clock-settings://changed";
export const CLOCK_WINDOW_VISIBILITY_EVENT = "clock-window://visibility";

export type SettingsPersistence = "saved" | "volatile";

export interface SettingsChangedPayload {
  settings: ClockSettings;
  persistence: SettingsPersistence;
}

export interface ClockWindowVisibilityPayload {
  visible: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);

  return (
    actualKeys.length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

export function isSettingsPersistence(value: unknown): value is SettingsPersistence {
  return value === "saved" || value === "volatile";
}

export function isSettingsChangedPayload(value: unknown): value is SettingsChangedPayload {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["settings", "persistence"]) &&
    isClockSettings(value.settings) &&
    isSettingsPersistence(value.persistence)
  );
}

export function isClockWindowVisibilityPayload(
  value: unknown
): value is ClockWindowVisibilityPayload {
  return isRecord(value) && hasOnlyKeys(value, ["visible"]) && typeof value.visible === "boolean";
}
