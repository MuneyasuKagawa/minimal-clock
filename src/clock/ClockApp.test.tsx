import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SettingsChangedPayload } from "../domain/events";
import { DEFAULT_CLOCK_SETTINGS, type ClockSettings } from "../domain/settings";
import type { ClockScheduleOptions, ClockScheduler } from "../services/clock-scheduler";
import type { DesktopClient } from "../services/desktop-client";
import { ClockApp } from "./ClockApp";

// --- Mock: useSettingsEvent ---

let settingsEventPayload: SettingsChangedPayload | null = null;

vi.mock("../services/use-settings-event", () => ({
  useSettingsEvent: () => settingsEventPayload,
}));

// --- Mock: useVisibilityEvent ---

let visibilityValue: boolean | null = null;

vi.mock("../services/use-visibility-event", () => ({
  useVisibilityEvent: () => visibilityValue,
}));

// --- Mock: createClockScheduler ---

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

// --- Helpers ---

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

const DIGITAL_SETTINGS: ClockSettings = {
  ...DEFAULT_CLOCK_SETTINGS,
  mode: "digital",
};

const ANALOG_SETTINGS: ClockSettings = {
  ...DEFAULT_CLOCK_SETTINGS,
  mode: "analog",
};

const FIXED_DATE = new Date(2026, 0, 15, 10, 30, 45);

async function renderAndInitialize(
  client: DesktopClient,
): Promise<ReturnType<typeof render>> {
  const result = render(<ClockApp desktopClient={client} />);

  await act(async () => {
    // flush the initializeClockWindow promise
  });

  return result;
}

// --- Tests ---

describe("ClockApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsEventPayload = null;
    visibilityValue = null;
  });

  describe("drag region", () => {
    it("has data-tauri-drag-region attribute on the clock container", async () => {
      const client = createMockDesktopClient();

      await renderAndInitialize(client);

      const container = screen.getByTestId("clock-page");

      expect(container).toHaveAttribute("data-tauri-drag-region");
    });
  });

  describe("accessibility", () => {
    it("has aria-label for the clock page", async () => {
      const client = createMockDesktopClient();

      await renderAndInitialize(client);

      const container = screen.getByTestId("clock-page");

      expect(container).toHaveAttribute("aria-label", "時計");
    });
  });

  describe("styling container", () => {
    it("has the clock-container class for CSS styling", async () => {
      const client = createMockDesktopClient();

      await renderAndInitialize(client);

      const container = screen.getByTestId("clock-page");

      expect(container).toHaveClass("clock-container");
    });
  });

  describe("initialization", () => {
    it("calls initializeClockWindow on mount", async () => {
      const client = createMockDesktopClient();

      await renderAndInitialize(client);

      expect(client.initializeClockWindow).toHaveBeenCalledTimes(1);
    });

    it("does not render a clock component before initialization completes", () => {
      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(
          () => new Promise<SettingsChangedPayload>(() => {}),
        ),
      });

      render(<ClockApp desktopClient={client} />);

      expect(screen.queryByTestId("digital-clock")).not.toBeInTheDocument();
      expect(screen.queryByTestId("analog-clock")).not.toBeInTheDocument();
    });

    it("renders DigitalClock after initialization with digital mode", async () => {
      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({
            settings: DIGITAL_SETTINGS,
            persistence: "saved" as const,
          }),
        ),
      });

      await renderAndInitialize(client);

      // Trigger a tick so that `now` is set
      act(() => {
        const onTick = mockScheduler.start.mock.calls[0]?.[1] as
          | ((now: Date) => void)
          | undefined;
        onTick?.(FIXED_DATE);
      });

      expect(screen.getByTestId("digital-clock")).toBeInTheDocument();
      expect(screen.queryByTestId("analog-clock-container")).not.toBeInTheDocument();
    });

    it("renders AnalogClock after initialization with analog mode", async () => {
      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({
            settings: ANALOG_SETTINGS,
            persistence: "saved" as const,
          }),
        ),
      });

      await renderAndInitialize(client);

      // Trigger a tick so that `now` is set
      act(() => {
        const onTick = mockScheduler.start.mock.calls[0]?.[1] as
          | ((now: Date) => void)
          | undefined;
        onTick?.(FIXED_DATE);
      });

      expect(screen.getByTestId("analog-clock-container")).toBeInTheDocument();
      expect(screen.queryByTestId("digital-clock")).not.toBeInTheDocument();
    });
  });

  describe("clock scheduler", () => {
    it("starts the scheduler after initialization with correct options", async () => {
      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({
            settings: { ...DIGITAL_SETTINGS, showSeconds: true },
            persistence: "saved" as const,
          }),
        ),
      });

      await renderAndInitialize(client);

      expect(mockScheduler.start).toHaveBeenCalledTimes(1);
      expect(mockScheduler.start).toHaveBeenCalledWith(
        { showSeconds: true, visible: true },
        expect.any(Function),
      );
    });

    it("updates time display when scheduler ticks", async () => {
      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({
            settings: DIGITAL_SETTINGS,
            persistence: "saved" as const,
          }),
        ),
      });

      await renderAndInitialize(client);

      act(() => {
        const onTick = mockScheduler.start.mock.calls[0]?.[1] as
          | ((now: Date) => void)
          | undefined;
        onTick?.(FIXED_DATE);
      });

      expect(screen.getByTestId("digital-time")).toBeInTheDocument();
    });

    it("stops the scheduler on unmount", async () => {
      const client = createMockDesktopClient();

      const { unmount } = await renderAndInitialize(client);

      unmount();

      expect(mockScheduler.stopFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("settings change events", () => {
    it("restarts scheduler when settings change event arrives", async () => {
      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({
            settings: DIGITAL_SETTINGS,
            persistence: "saved" as const,
          }),
        ),
      });

      const { rerender } = await renderAndInitialize(client);

      // Simulate settings change event
      settingsEventPayload = {
        settings: { ...DIGITAL_SETTINGS, showSeconds: false },
        persistence: "saved" as const,
      };

      rerender(<ClockApp desktopClient={client} />);

      expect(mockScheduler.restart).toHaveBeenCalledWith(
        expect.objectContaining({ showSeconds: false }),
      );
    });

    it("switches from digital to analog when mode changes", async () => {
      const client = createMockDesktopClient({
        initializeClockWindow: vi.fn(() =>
          Promise.resolve({
            settings: DIGITAL_SETTINGS,
            persistence: "saved" as const,
          }),
        ),
      });

      const { rerender } = await renderAndInitialize(client);

      // Trigger initial tick
      act(() => {
        const onTick = mockScheduler.start.mock.calls[0]?.[1] as
          | ((now: Date) => void)
          | undefined;
        onTick?.(FIXED_DATE);
      });

      expect(screen.getByTestId("digital-clock")).toBeInTheDocument();

      // Simulate settings change to analog
      settingsEventPayload = {
        settings: ANALOG_SETTINGS,
        persistence: "saved" as const,
      };

      rerender(<ClockApp desktopClient={client} />);

      expect(screen.getByTestId("analog-clock-container")).toBeInTheDocument();
      expect(screen.queryByTestId("digital-clock")).not.toBeInTheDocument();
    });
  });

  describe("visibility events", () => {
    it("restarts scheduler when visibility changes to hidden", async () => {
      const client = createMockDesktopClient();

      const { rerender } = await renderAndInitialize(client);

      // Simulate visibility change to hidden
      visibilityValue = false;

      rerender(<ClockApp desktopClient={client} />);

      expect(mockScheduler.restart).toHaveBeenCalledWith(
        expect.objectContaining({ visible: false }),
      );
    });

    it("restarts scheduler when visibility changes to visible", async () => {
      const client = createMockDesktopClient();

      const { rerender } = await renderAndInitialize(client);

      // First hide
      visibilityValue = false;
      rerender(<ClockApp desktopClient={client} />);

      // Then show
      visibilityValue = true;
      rerender(<ClockApp desktopClient={client} />);

      const restartCalls = mockScheduler.restart.mock.calls;
      const lastCall = restartCalls[restartCalls.length - 1] as
        | [ClockScheduleOptions]
        | undefined;

      expect(lastCall?.[0]?.visible).toBe(true);
    });
  });
});
