import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CLOCK_WINDOW_VISIBILITY_EVENT } from "../domain/events";
import { useVisibilityEvent } from "./use-visibility-event";

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

describe("useVisibilityEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedListeners = new Map();
  });

  it("returns null before any event is received", () => {
    const { result } = renderHook(() => useVisibilityEvent());

    expect(result.current).toBeNull();
  });

  it("subscribes to the clock window visibility event on mount", async () => {
    renderHook(() => useVisibilityEvent());

    await vi.dynamicImportSettled();

    expect(capturedListeners.has(CLOCK_WINDOW_VISIBILITY_EVENT)).toBe(true);
  });

  it("returns true when a visible event is received", async () => {
    const { result } = renderHook(() => useVisibilityEvent());

    await vi.dynamicImportSettled();

    act(() => {
      const listener = capturedListeners.get(CLOCK_WINDOW_VISIBILITY_EVENT);
      listener?.({ payload: { visible: true } });
    });

    expect(result.current).toBe(true);
  });

  it("returns false when a hidden event is received", async () => {
    const { result } = renderHook(() => useVisibilityEvent());

    await vi.dynamicImportSettled();

    act(() => {
      const listener = capturedListeners.get(CLOCK_WINDOW_VISIBILITY_EVENT);
      listener?.({ payload: { visible: false } });
    });

    expect(result.current).toBe(false);
  });

  it("ignores events with invalid payloads", async () => {
    const { result } = renderHook(() => useVisibilityEvent());

    await vi.dynamicImportSettled();

    act(() => {
      const listener = capturedListeners.get(CLOCK_WINDOW_VISIBILITY_EVENT);
      listener?.({ payload: { visible: "true" } });
    });

    expect(result.current).toBeNull();
  });

  it("ignores events with extra fields", async () => {
    const { result } = renderHook(() => useVisibilityEvent());

    await vi.dynamicImportSettled();

    act(() => {
      const listener = capturedListeners.get(CLOCK_WINDOW_VISIBILITY_EVENT);
      listener?.({ payload: { visible: true, reason: "restore" } });
    });

    expect(result.current).toBeNull();
  });

  it("updates to the latest visibility state", async () => {
    const { result } = renderHook(() => useVisibilityEvent());

    await vi.dynamicImportSettled();

    act(() => {
      const listener = capturedListeners.get(CLOCK_WINDOW_VISIBILITY_EVENT);
      listener?.({ payload: { visible: true } });
    });

    expect(result.current).toBe(true);

    act(() => {
      const listener = capturedListeners.get(CLOCK_WINDOW_VISIBILITY_EVENT);
      listener?.({ payload: { visible: false } });
    });

    expect(result.current).toBe(false);
  });

  it("calls unlisten on unmount", async () => {
    const { unmount } = renderHook(() => useVisibilityEvent());

    await vi.dynamicImportSettled();

    unmount();

    expect(mockUnlisten).toHaveBeenCalledTimes(1);
  });
});
