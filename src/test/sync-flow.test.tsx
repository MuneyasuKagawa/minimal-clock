import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SettingsChangedPayload } from "../domain/events";
import { isSettingsChangedPayload } from "../domain/events";
import { DEFAULT_CLOCK_SETTINGS, type ClockSettings } from "../domain/settings";
import type { ClockScheduleOptions, ClockScheduler } from "../services/clock-scheduler";
import type { DesktopClient } from "../services/desktop-client";
import { ClockApp } from "../clock/ClockApp";
import { SettingsApp } from "../settings/SettingsApp";

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

async function renderSettingsApp(
  client: DesktopClient,
): Promise<ReturnType<typeof render>> {
  const result = render(<SettingsApp desktopClient={client} />);

  await act(async () => {
    // flush getAppliedSettings promise
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
        mode: "digital",
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
        mode: "analog",
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
  // 3. ContextMenu alwaysOnTop toggle → SettingsApp event sync
  // -------------------------------------------------------------------------

  describe("alwaysOnTop toggle from ContextMenu → SettingsApp sync", () => {
    it("ContextMenu toggle produces a payload that SettingsApp event handler merges correctly", async () => {
      // Step 1: SettingsApp loads with alwaysOnTop=true (default)
      const client = createMockDesktopClient();

      const { rerender } = await renderSettingsApp(client);

      // Step 2: User edits showSeconds off in the settings form
      fireEvent.click(screen.getByLabelText("秒を表示"));

      const showSecondsAfterEdit = screen.getByLabelText("秒を表示") as HTMLInputElement;

      expect(showSecondsAfterEdit.checked).toBe(false);

      // Step 3: Simulate the event that would arrive when ContextMenu toggles
      // alwaysOnTop from true → false via applySettings
      const toggledSettings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        alwaysOnTop: false,
      };

      settingsEventPayload = {
        settings: toggledSettings,
        persistence: "saved",
      };

      rerender(<SettingsApp desktopClient={client} />);

      // Step 4: Verify alwaysOnTop was synced
      const alwaysOnTop = screen.getByLabelText("常に最前面") as HTMLInputElement;

      expect(alwaysOnTop.checked).toBe(false);

      // Step 5: Verify the user's showSeconds edit was preserved
      const showSecondsAfterSync = screen.getByLabelText("秒を表示") as HTMLInputElement;

      expect(showSecondsAfterSync.checked).toBe(false);
    });

    it("subsequent save from SettingsApp does not revert the synced alwaysOnTop value", async () => {
      const appliedPayloads: ClockSettings[] = [];

      const client = createMockDesktopClient({
        applySettings: vi.fn((settings: ClockSettings) => {
          appliedPayloads.push(settings);
          return Promise.resolve({ settings, persistence: "saved" as const });
        }),
      });

      const { rerender } = await renderSettingsApp(client);

      // User edits showDate on
      fireEvent.click(screen.getByLabelText("日付を表示"));

      // External event: alwaysOnTop toggled off from clock menu
      settingsEventPayload = {
        settings: { ...DEFAULT_CLOCK_SETTINGS, alwaysOnTop: false },
        persistence: "saved",
      };

      rerender(<SettingsApp desktopClient={client} />);

      // User saves the form
      const saveButton = screen.getByRole("button", { name: "保存" });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      // The saved payload must include alwaysOnTop=false (from the sync)
      // AND showDate=true (from the user edit)
      expect(appliedPayloads).toHaveLength(1);

      const savedSettings = appliedPayloads[0];

      expect(savedSettings?.alwaysOnTop).toBe(false);
      expect(savedSettings?.showDate).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Volatile state handling
  // -------------------------------------------------------------------------

  describe("volatile state from applySettings → retry clears", () => {
    it("shows volatile indicator when applySettings returns volatile, clears after retry", async () => {
      const client = createMockDesktopClient({
        applySettings: vi.fn((settings: ClockSettings) =>
          Promise.resolve({
            settings,
            persistence: "volatile" as const,
          }),
        ),
        retrySettingsPersistence: vi.fn(() =>
          Promise.resolve({
            settings: DEFAULT_CLOCK_SETTINGS,
            persistence: "saved" as const,
          }),
        ),
      });

      await renderSettingsApp(client);

      // Save — should return volatile
      const saveButton = screen.getByRole("button", { name: "保存" });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(screen.getByTestId("volatile-indicator")).toBeInTheDocument();

      // Retry — should clear volatile
      const retryButton = screen.getByRole("button", { name: "再試行" });

      await act(async () => {
        fireEvent.click(retryButton);
      });

      expect(screen.queryByTestId("volatile-indicator")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 5. Volatile state on re-display
  // -------------------------------------------------------------------------

  describe("volatile state on SettingsApp re-display", () => {
    it("displays volatile state from getAppliedSettings without overwriting to saved", async () => {
      const volatileSettings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        alwaysOnTop: false,
      };

      const client = createMockDesktopClient({
        getAppliedSettings: vi.fn(() =>
          Promise.resolve({
            settings: volatileSettings,
            persistence: "volatile" as const,
          }),
        ),
      });

      await renderSettingsApp(client);

      // Should show volatile indicator
      expect(screen.getByTestId("volatile-indicator")).toBeInTheDocument();

      // Should display the volatile settings, not default saved values
      const alwaysOnTop = screen.getByLabelText("常に最前面") as HTMLInputElement;

      expect(alwaysOnTop.checked).toBe(false);
    });

    it("preserves volatile persistence from event when getAppliedSettings returned saved", async () => {
      const client = createMockDesktopClient();

      const { rerender } = await renderSettingsApp(client);

      // Initially saved
      expect(screen.queryByTestId("volatile-indicator")).not.toBeInTheDocument();

      // External event with volatile persistence
      settingsEventPayload = {
        settings: { ...DEFAULT_CLOCK_SETTINGS, alwaysOnTop: false },
        persistence: "volatile",
      };

      rerender(<SettingsApp desktopClient={client} />);

      // Should now show volatile
      expect(screen.getByTestId("volatile-indicator")).toBeInTheDocument();
    });
  });

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

  // -------------------------------------------------------------------------
  // 7. Apply failure does not change state
  // -------------------------------------------------------------------------

  describe("apply failure does not change state", () => {
    it("keeps form edits and does not update persistence when applySettings never resolves", async () => {
      // Simulate a scenario where applySettings hangs (never resolves).
      // This verifies the invariant that until the .then() callback fires,
      // the form state and persistence remain unchanged.
      const client = createMockDesktopClient({
        applySettings: vi.fn(
          () => new Promise<SettingsChangedPayload>(() => {}),
        ),
      });

      await renderSettingsApp(client);

      // Edit showDate on
      fireEvent.click(screen.getByLabelText("日付を表示"));

      const showDateBefore = screen.getByLabelText("日付を表示") as HTMLInputElement;

      expect(showDateBefore.checked).toBe(true);

      // Save — will call applySettings but it never resolves
      const saveButton = screen.getByRole("button", { name: "保存" });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      // applySettings was called
      expect(client.applySettings).toHaveBeenCalledTimes(1);

      // The form should still show the user's edits (not overwritten)
      const showDateAfter = screen.getByLabelText("日付を表示") as HTMLInputElement;

      expect(showDateAfter.checked).toBe(true);

      // Save button should be disabled (still waiting for response)
      expect(saveButton).toBeDisabled();

      // Volatile indicator should NOT appear since no response was received
      expect(screen.queryByTestId("volatile-indicator")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 8. Cross-component settings event propagation invariant
  // -------------------------------------------------------------------------

  describe("settings event propagation invariant", () => {
    it("settings event delivered to ClockApp updates the clock display mode", async () => {
      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({
            settings: { ...DEFAULT_CLOCK_SETTINGS, mode: "digital" as const },
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
        settings: { ...DEFAULT_CLOCK_SETTINGS, mode: "analog" },
        persistence: "saved",
      };

      rerender(<ClockApp desktopClient={client} />);

      expect(screen.getByTestId("analog-clock-container")).toBeInTheDocument();
      expect(screen.queryByTestId("digital-clock")).not.toBeInTheDocument();
    });

    it("settings event delivered to SettingsApp syncs alwaysOnTop only", async () => {
      const client = createMockDesktopClient();

      const { rerender } = await renderSettingsApp(client);

      // User makes multiple edits: showSeconds off, showDate on, mode analog
      fireEvent.click(screen.getByLabelText("秒を表示"));
      fireEvent.click(screen.getByLabelText("日付を表示"));
      fireEvent.click(screen.getByLabelText("アナログ"));

      // External event changes alwaysOnTop only
      settingsEventPayload = {
        settings: { ...DEFAULT_CLOCK_SETTINGS, alwaysOnTop: false },
        persistence: "saved",
      };

      rerender(<SettingsApp desktopClient={client} />);

      // alwaysOnTop synced
      const alwaysOnTop = screen.getByLabelText("常に最前面") as HTMLInputElement;

      expect(alwaysOnTop.checked).toBe(false);

      // Other edits preserved
      const showSeconds = screen.getByLabelText("秒を表示") as HTMLInputElement;
      const showDate = screen.getByLabelText("日付を表示") as HTMLInputElement;
      const analogRadio = screen.getByLabelText("アナログ") as HTMLInputElement;

      expect(showSeconds.checked).toBe(false);
      expect(showDate.checked).toBe(true);
      expect(analogRadio.checked).toBe(true);
    });
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
