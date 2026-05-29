import { describe, expect, it } from "vitest";

import { DEFAULT_CLOCK_SETTINGS } from "./settings";
import {
  CLOCK_SETTINGS_CHANGED_EVENT,
  CLOCK_WINDOW_VISIBILITY_EVENT,
  isClockWindowVisibilityPayload,
  isSettingsChangedPayload
} from "./events";

describe("events contract", () => {
  it("defines stable event identifiers for settings and visibility notifications", () => {
    expect(CLOCK_SETTINGS_CHANGED_EVENT).toBe("clock-settings://changed");
    expect(CLOCK_WINDOW_VISIBILITY_EVENT).toBe("clock-window://visibility");
  });

  it("accepts saved and volatile applied settings payloads", () => {
    expect(
      isSettingsChangedPayload({
        settings: DEFAULT_CLOCK_SETTINGS,
        persistence: "saved"
      })
    ).toBe(true);

    expect(
      isSettingsChangedPayload({
        settings: {
          ...DEFAULT_CLOCK_SETTINGS,
          alwaysOnTop: false
        },
        persistence: "volatile"
      })
    ).toBe(true);
  });

  it("rejects invalid settings notification payloads", () => {
    expect(isSettingsChangedPayload(null)).toBe(false);
    expect(isSettingsChangedPayload({ settings: DEFAULT_CLOCK_SETTINGS })).toBe(false);
    expect(
      isSettingsChangedPayload({
        settings: DEFAULT_CLOCK_SETTINGS,
        persistence: "pending"
      })
    ).toBe(false);
    expect(
      isSettingsChangedPayload({
        settings: { ...DEFAULT_CLOCK_SETTINGS, clockStyle: "compact" },
        persistence: "saved"
      })
    ).toBe(false);
  });

  it("accepts only clock window visibility payloads with a boolean visible state", () => {
    expect(isClockWindowVisibilityPayload({ visible: true })).toBe(true);
    expect(isClockWindowVisibilityPayload({ visible: false })).toBe(true);
    expect(isClockWindowVisibilityPayload({ visible: "true" })).toBe(false);
    expect(isClockWindowVisibilityPayload({ visible: true, reason: "restore" })).toBe(false);
  });
});
