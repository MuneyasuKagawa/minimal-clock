import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CLOCK_SETTINGS_CHANGED_EVENT } from "../domain/events";
import { DEFAULT_CLOCK_SETTINGS } from "../domain/settings";
import { useSettingsEvent } from "./use-settings-event";

type ListenCallback = (event: { payload: unknown }) => void;

const mockUnlisten = vi.fn();
let capturedListeners: Map<string, ListenCallback>;

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(
    (eventName: string, callback: ListenCallback): Promise<() => void> => {
      capturedListeners.set(eventName, callback);
      return Promise.resolve(mockUnlisten);
    }
  ),
}));

describe("useSettingsEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedListeners = new Map();
  });

  it("returns null before any event is received", () => {
    const { result } = renderHook(() => useSettingsEvent());

    expect(result.current).toBeNull();
  });

  it("subscribes to the clock settings changed event on mount", async () => {
    renderHook(() => useSettingsEvent());

    await vi.dynamicImportSettled();

    expect(capturedListeners.has(CLOCK_SETTINGS_CHANGED_EVENT)).toBe(true);
  });

  it("returns the payload when a valid settings changed event is received", async () => {
    const { result } = renderHook(() => useSettingsEvent());

    await vi.dynamicImportSettled();

    const validPayload = {
      settings: DEFAULT_CLOCK_SETTINGS,
      persistence: "saved" as const,
    };

    act(() => {
      const listener = capturedListeners.get(CLOCK_SETTINGS_CHANGED_EVENT);
      listener?.({ payload: validPayload });
    });

    expect(result.current).toEqual(validPayload);
  });

  it("returns volatile payload when persistence is volatile", async () => {
    const { result } = renderHook(() => useSettingsEvent());

    await vi.dynamicImportSettled();

    const volatilePayload = {
      settings: { ...DEFAULT_CLOCK_SETTINGS, alwaysOnTop: false },
      persistence: "volatile" as const,
    };

    act(() => {
      const listener = capturedListeners.get(CLOCK_SETTINGS_CHANGED_EVENT);
      listener?.({ payload: volatilePayload });
    });

    expect(result.current).toEqual(volatilePayload);
    expect(result.current?.persistence).toBe("volatile");
  });

  it("ignores events with invalid payloads", async () => {
    const { result } = renderHook(() => useSettingsEvent());

    await vi.dynamicImportSettled();

    act(() => {
      const listener = capturedListeners.get(CLOCK_SETTINGS_CHANGED_EVENT);
      listener?.({ payload: { invalid: true } });
    });

    expect(result.current).toBeNull();
  });

  it("updates to the latest valid event payload", async () => {
    const { result } = renderHook(() => useSettingsEvent());

    await vi.dynamicImportSettled();

    const firstPayload = {
      settings: DEFAULT_CLOCK_SETTINGS,
      persistence: "saved" as const,
    };

    const secondPayload = {
      settings: { ...DEFAULT_CLOCK_SETTINGS, showSeconds: false },
      persistence: "volatile" as const,
    };

    act(() => {
      const listener = capturedListeners.get(CLOCK_SETTINGS_CHANGED_EVENT);
      listener?.({ payload: firstPayload });
    });

    expect(result.current).toEqual(firstPayload);

    act(() => {
      const listener = capturedListeners.get(CLOCK_SETTINGS_CHANGED_EVENT);
      listener?.({ payload: secondPayload });
    });

    expect(result.current).toEqual(secondPayload);
  });

  it("calls unlisten on unmount", async () => {
    const { unmount } = renderHook(() => useSettingsEvent());

    await vi.dynamicImportSettled();

    unmount();

    expect(mockUnlisten).toHaveBeenCalledTimes(1);
  });
});
