import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SettingsChangedPayload } from "../domain/events";
import { isSettingsChangedPayload } from "../domain/events";
import { DEFAULT_CLOCK_SETTINGS, type ClockSettings } from "../domain/settings";
import type { ClockScheduleOptions, ClockScheduler } from "../services/clock-scheduler";
import type { DesktopClient } from "../services/desktop-client";
import { ClockApp } from "../clock/ClockApp";

// ---------------------------------------------------------------------------
// Mock: useSettingsEvent
// ---------------------------------------------------------------------------

let settingsEventPayload: SettingsChangedPayload | null = null;

vi.mock("../services/use-settings-event", () => ({
  useSettingsEvent: () => settingsEventPayload,
}));

// ---------------------------------------------------------------------------
// Mock: useVisibilityEvent
// ---------------------------------------------------------------------------

let visibilityValue: boolean | null = null;

vi.mock("../services/use-visibility-event", () => ({
  useVisibilityEvent: () => visibilityValue,
}));

// ---------------------------------------------------------------------------
// Mock: createClockScheduler
// ---------------------------------------------------------------------------

let mockScheduler: {
  start: ReturnType<typeof vi.fn>;
  restart: ReturnType<typeof vi.fn>;
  stopFn: ReturnType<typeof vi.fn>;
};

vi.mock("../services/clock-scheduler", () => ({
  createClockScheduler: (): ClockScheduler => {
    const stopFn = vi.fn();
    const start = vi.fn(
      (_options: ClockScheduleOptions, _onTick: (now: Date) => void) => stopFn,
    );
    const restart = vi.fn();

    mockScheduler = { start, restart, stopFn };

    return { start, restart };
  },
}));

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function createMockDesktopClient(
  overrides: Partial<DesktopClient> = {},
): DesktopClient {
  return {
    initializeClockWindow: vi.fn(() =>
      Promise.resolve({
        settings: DEFAULT_CLOCK_SETTINGS,
        persistence: "saved" as const,
      }),
    ),
    openSettingsWindow: vi.fn(() => Promise.resolve()),
    getAppliedSettings: vi.fn(() =>
      Promise.resolve({
        settings: DEFAULT_CLOCK_SETTINGS,
        persistence: "saved" as const,
      }),
    ),
    applySettings: vi.fn((settings: ClockSettings) =>
      Promise.resolve({
        settings,
        persistence: "saved" as const,
      }),
    ),
    retrySettingsPersistence: vi.fn(() =>
      Promise.resolve({
        settings: DEFAULT_CLOCK_SETTINGS,
        persistence: "saved" as const,
      }),
    ),
    quitApplication: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

async function renderClockApp(
  client: DesktopClient,
): Promise<ReturnType<typeof render>> {
  const result = render(<ClockApp desktopClient={client} />);

  await act(async () => {
    // flush initializeClockWindow promise
  });

  return result;
}

const FIXED_DATE = new Date(2026, 0, 15, 10, 30, 45);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Sync flow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsEventPayload = null;
    visibilityValue = null;
  });

  // -------------------------------------------------------------------------
  // 1. Init flow: runtime settings → ClockApp render
  // -------------------------------------------------------------------------

  describe("init flow: runtime settings applied to clock display", () => {
    it("renders digital clock when initializeClockWindow returns digital settings", async () => {
      const digitalSettings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        clockStyle: "digital",
      };

      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({ settings: digitalSettings, persistence: "saved" as const }),
        ),
      });

      await renderClockApp(client);

      // Trigger a scheduler tick so the clock renders
      act(() => {
        const onTick = mockScheduler.start.mock.calls[0]?.[1] as
          | ((now: Date) => void)
          | undefined;
        onTick?.(FIXED_DATE);
      });

      expect(screen.getByTestId("digital-clock")).toBeInTheDocument();
      expect(screen.queryByTestId("analog-clock-container")).not.toBeInTheDocument();
    });

    it("renders analog clock when initializeClockWindow returns analog settings", async () => {
      const analogSettings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        clockStyle: "analog-simple",
      };

      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({ settings: analogSettings, persistence: "saved" as const }),
        ),
      });

      await renderClockApp(client);

      act(() => {
        const onTick = mockScheduler.start.mock.calls[0]?.[1] as
          | ((now: Date) => void)
          | undefined;
        onTick?.(FIXED_DATE);
      });

      expect(screen.getByTestId("analog-clock-container")).toBeInTheDocument();
      expect(screen.queryByTestId("digital-clock")).not.toBeInTheDocument();
    });

    it("passes showSeconds from init payload to the scheduler", async () => {
      const noSecondsSettings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        showSeconds: false,
      };

      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({ settings: noSecondsSettings, persistence: "saved" as const }),
        ),
      });

      await renderClockApp(client);

      expect(mockScheduler.start).toHaveBeenCalledWith(
        { showSeconds: false, visible: true },
        expect.any(Function),
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. DesktopClient payload contract consistency
  // -------------------------------------------------------------------------

  describe("DesktopClient payload contract", () => {
    it("initializeClockWindow returns a valid SettingsChangedPayload", async () => {
      const client = createMockDesktopClient();

      const payload = await client.initializeClockWindow();

      expect(isSettingsChangedPayload(payload)).toBe(true);
    });

    it("getAppliedSettings returns a valid SettingsChangedPayload", async () => {
      const client = createMockDesktopClient();

      const payload = await client.getAppliedSettings();

      expect(isSettingsChangedPayload(payload)).toBe(true);
    });

    it("applySettings returns a valid SettingsChangedPayload", async () => {
      const client = createMockDesktopClient();

      const payload = await client.applySettings(DEFAULT_CLOCK_SETTINGS);

      expect(isSettingsChangedPayload(payload)).toBe(true);
    });

    it("retrySettingsPersistence returns a valid SettingsChangedPayload", async () => {
      const client = createMockDesktopClient();

      const payload = await client.retrySettingsPersistence();

      expect(isSettingsChangedPayload(payload)).toBe(true);
    });

    it("the shape SettingsApp sends to applySettings produces a payload ClockApp can consume", async () => {
      // Simulate SettingsApp editing then saving
      const editedSettings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        showSeconds: false,
        showDate: true,
      };

      const client = createMockDesktopClient({
        applySettings: vi.fn((settings: ClockSettings) =>
          Promise.resolve({ settings, persistence: "saved" as const }),
        ),
      });

      const resultPayload = await client.applySettings(editedSettings);

      // The returned payload must be a valid SettingsChangedPayload that
      // ClockApp's useSettingsEvent would accept
      expect(isSettingsChangedPayload(resultPayload)).toBe(true);
      expect(resultPayload.settings.showSeconds).toBe(false);
      expect(resultPayload.settings.showDate).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 3-5. SettingsApp sync tests moved to SettingsApp.test.tsx
  // -------------------------------------------------------------------------

  // SettingsApp sync, volatile, and re-display tests are in SettingsApp.test.tsx

  // -------------------------------------------------------------------------
  // 6. Visibility → scheduler control
  // -------------------------------------------------------------------------

  describe("visibility change controls scheduler", () => {
    it("stops scheduler when visibility changes to hidden and resumes on visible", async () => {
      const client = createMockDesktopClient();

      const { rerender } = await renderClockApp(client);

      // Initial start with visible=true
      expect(mockScheduler.start).toHaveBeenCalledWith(
        expect.objectContaining({ visible: true }),
        expect.any(Function),
      );

      // Hide
      visibilityValue = false;

      rerender(<ClockApp desktopClient={client} />);

      expect(mockScheduler.restart).toHaveBeenCalledWith(
        expect.objectContaining({ visible: false }),
      );

      // Show again
      visibilityValue = true;

      rerender(<ClockApp desktopClient={client} />);

      const restartCalls = mockScheduler.restart.mock.calls;
      const lastCall = restartCalls[restartCalls.length - 1] as
        | [ClockScheduleOptions]
        | undefined;

      expect(lastCall?.[0]?.visible).toBe(true);
    });

    it("scheduler receives current showSeconds setting on visibility restore", async () => {
      const noSecondsSettings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        showSeconds: false,
      };

      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({ settings: noSecondsSettings, persistence: "saved" as const }),
        ),
      });

      const { rerender } = await renderClockApp(client);

      // Hide then show
      visibilityValue = false;
      rerender(<ClockApp desktopClient={client} />);

      visibilityValue = true;
      rerender(<ClockApp desktopClient={client} />);

      const restartCalls = mockScheduler.restart.mock.calls;
      const lastCall = restartCalls[restartCalls.length - 1] as
        | [ClockScheduleOptions]
        | undefined;

      expect(lastCall?.[0]).toEqual({ showSeconds: false, visible: true });
    });
  });

  // Apply failure tests moved to SettingsApp.test.tsx

  // -------------------------------------------------------------------------
  // 8. Cross-component settings event propagation invariant
  // -------------------------------------------------------------------------

  describe("settings event propagation invariant", () => {
    it("settings event delivered to ClockApp updates the clock display mode", async () => {
      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({
            settings: { ...DEFAULT_CLOCK_SETTINGS, clockStyle: "digital" as const },
            persistence: "saved" as const,
          }),
        ),
      });

      const { rerender } = await renderClockApp(client);

      // Trigger initial tick
      act(() => {
        const onTick = mockScheduler.start.mock.calls[0]?.[1] as
          | ((now: Date) => void)
          | undefined;
        onTick?.(FIXED_DATE);
      });

      expect(screen.getByTestId("digital-clock")).toBeInTheDocument();

      // Simulate a settings change event (as if SettingsApp saved with analog mode)
      settingsEventPayload = {
        settings: { ...DEFAULT_CLOCK_SETTINGS, clockStyle: "analog-simple" },
        persistence: "saved",
      };

      rerender(<ClockApp desktopClient={client} />);

      expect(screen.getByTestId("analog-clock-container")).toBeInTheDocument();
      expect(screen.queryByTestId("digital-clock")).not.toBeInTheDocument();
    });

    // SettingsApp event sync tested in SettingsApp.test.tsx
  });

  // -------------------------------------------------------------------------
  // 9. Settings change + visibility change combined
  // -------------------------------------------------------------------------

  describe("combined settings and visibility changes", () => {
    it("scheduler receives updated settings even when visibility toggles simultaneously", async () => {
      const client = createMockDesktopClient();

      const { rerender } = await renderClockApp(client);

      // Settings change and visibility change arrive together
      settingsEventPayload = {
        settings: { ...DEFAULT_CLOCK_SETTINGS, showSeconds: false },
        persistence: "saved",
      };
      visibilityValue = false;

      rerender(<ClockApp desktopClient={client} />);

      // Scheduler should have restarted with both new settings and visibility
      const restartCalls = mockScheduler.restart.mock.calls;

      // Find a call that has showSeconds: false
      const hasExpectedRestart = restartCalls.some(
        (call: unknown[]) => {
          const options = call[0] as ClockScheduleOptions | undefined;
          return options?.showSeconds === false;
        },
      );

      expect(hasExpectedRestart).toBe(true);
    });
  });
});
