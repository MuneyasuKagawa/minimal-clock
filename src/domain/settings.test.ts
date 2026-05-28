import { describe, expect, it } from "vitest";

import {
  CLOCK_MODES,
  DEFAULT_CLOCK_SETTINGS,
  isClockMode,
  isClockSettings
} from "./settings";

describe("settings domain contract", () => {
  it("defines the supported display modes", () => {
    expect(CLOCK_MODES).toEqual(["digital", "analog"]);
    expect(isClockMode("digital")).toBe(true);
    expect(isClockMode("analog")).toBe(true);
    expect(isClockMode("compact")).toBe(false);
  });

  it("defines the required startup defaults", () => {
    expect(DEFAULT_CLOCK_SETTINGS).toEqual({
      mode: "digital",
      showSeconds: true,
      hour24: true,
      showDate: false,
      alwaysOnTop: true
    });
  });

  it("accepts a complete valid settings snapshot", () => {
    expect(
      isClockSettings({
        mode: "analog",
        showSeconds: false,
        hour24: false,
        showDate: true,
        alwaysOnTop: false
      })
    ).toBe(true);
  });

  it("rejects missing, invalid, or extension fields", () => {
    expect(isClockSettings(null)).toBe(false);
    expect(isClockSettings({ ...DEFAULT_CLOCK_SETTINGS, mode: "compact" })).toBe(false);
    expect(isClockSettings({ ...DEFAULT_CLOCK_SETTINGS, showSeconds: "true" })).toBe(false);
    expect(isClockSettings({ ...DEFAULT_CLOCK_SETTINGS, showDate: undefined })).toBe(false);
    expect(isClockSettings({ ...DEFAULT_CLOCK_SETTINGS, opacity: 0.8 })).toBe(false);
  });
});
