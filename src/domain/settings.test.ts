import { describe, expect, it } from "vitest";

import {
  CLOCK_STYLES,
  DEFAULT_CLOCK_SETTINGS,
  isClockStyle,
  isClockSettings
} from "./settings";

describe("settings domain contract", () => {
  it("defines the supported display styles", () => {
    expect(CLOCK_STYLES).toEqual(["digital", "analog-simple", "analog-numbers", "analog-markers"]);
    expect(isClockStyle("digital")).toBe(true);
    expect(isClockStyle("analog-simple")).toBe(true);
    expect(isClockStyle("compact")).toBe(false);
  });

  it("defines the required startup defaults", () => {
    expect(DEFAULT_CLOCK_SETTINGS).toMatchObject({
      clockStyle: "digital",
      showSeconds: true,
      hour24: true,
      showDate: false,
      alwaysOnTop: true
    });
  });

  it("accepts a complete valid settings snapshot", () => {
    expect(isClockSettings({ ...DEFAULT_CLOCK_SETTINGS })).toBe(true);
    expect(isClockSettings({ ...DEFAULT_CLOCK_SETTINGS, clockStyle: "analog-simple" })).toBe(true);
  });

  it("rejects missing, invalid, or extension fields", () => {
    expect(isClockSettings(null)).toBe(false);
    expect(isClockSettings({ ...DEFAULT_CLOCK_SETTINGS, clockStyle: "compact" })).toBe(false);
    expect(isClockSettings({ ...DEFAULT_CLOCK_SETTINGS, showSeconds: "true" })).toBe(false);
  });
});
