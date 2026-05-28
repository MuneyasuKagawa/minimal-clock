import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SettingsChangedPayload } from "../domain/events";
import { DEFAULT_CLOCK_SETTINGS, type ClockSettings } from "../domain/settings";
import type { DesktopClient } from "../services/desktop-client";
import { SettingsApp } from "./SettingsApp";

// --- Mock: useSettingsEvent ---

let settingsEventPayload: SettingsChangedPayload | null = null;

vi.mock("../services/use-settings-event", () => ({
  useSettingsEvent: () => settingsEventPayload,
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

async function renderAndLoad(
  client: DesktopClient,
): Promise<ReturnType<typeof render>> {
  const result = render(<SettingsApp desktopClient={client} />);

  await act(async () => {
    // flush the getAppliedSettings promise
  });

  return result;
}

// --- Tests ---

describe("SettingsApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsEventPayload = null;
  });

  describe("initialization", () => {
    it("calls getAppliedSettings on mount", async () => {
      const client = createMockDesktopClient();

      await renderAndLoad(client);

      expect(client.getAppliedSettings).toHaveBeenCalledTimes(1);
    });

    it("renders the settings page root with aria-label", async () => {
      const client = createMockDesktopClient();

      await renderAndLoad(client);

      const page = screen.getByTestId("settings-page");

      expect(page).toBeInTheDocument();
      expect(page).toHaveAttribute("aria-label", "設定");
    });

    it("renders form with loaded settings values", async () => {
      const customSettings: ClockSettings = {
        mode: "analog",
        showSeconds: false,
        hour24: false,
        showDate: true,
        alwaysOnTop: false,
      };

      const client = createMockDesktopClient({
        getAppliedSettings: vi.fn(() =>
          Promise.resolve({
            settings: customSettings,
            persistence: "saved" as const,
          }),
        ),
      });

      await renderAndLoad(client);

      const analogRadio = screen.getByLabelText("アナログ") as HTMLInputElement;
      const digitalRadio = screen.getByLabelText("デジタル") as HTMLInputElement;
      const showSeconds = screen.getByLabelText("秒を表示") as HTMLInputElement;
      const hour24 = screen.getByLabelText("24時間表記") as HTMLInputElement;
      const showDate = screen.getByLabelText("日付を表示") as HTMLInputElement;
      const alwaysOnTop = screen.getByLabelText("常に最前面") as HTMLInputElement;

      expect(analogRadio.checked).toBe(true);
      expect(digitalRadio.checked).toBe(false);
      expect(showSeconds.checked).toBe(false);
      expect(hour24.checked).toBe(false);
      expect(showDate.checked).toBe(true);
      expect(alwaysOnTop.checked).toBe(false);
    });

    it("does not render form fields before loading completes", () => {
      const client = createMockDesktopClient({
        getAppliedSettings: vi.fn(
          () => new Promise<SettingsChangedPayload>(() => {}),
        ),
      });

      render(<SettingsApp desktopClient={client} />);

      expect(screen.queryByLabelText("デジタル")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("アナログ")).not.toBeInTheDocument();
    });
  });

  describe("form fields", () => {
    it("renders digital radio as checked for default settings", async () => {
      const client = createMockDesktopClient();

      await renderAndLoad(client);

      const digitalRadio = screen.getByLabelText("デジタル") as HTMLInputElement;

      expect(digitalRadio.checked).toBe(true);
    });

    it("can toggle mode from digital to analog", async () => {
      const client = createMockDesktopClient();

      await renderAndLoad(client);

      const analogRadio = screen.getByLabelText("アナログ") as HTMLInputElement;

      fireEvent.click(analogRadio);

      expect(analogRadio.checked).toBe(true);
    });

    it("can toggle showSeconds checkbox", async () => {
      const client = createMockDesktopClient();

      await renderAndLoad(client);

      const showSeconds = screen.getByLabelText("秒を表示") as HTMLInputElement;

      // Default is true
      expect(showSeconds.checked).toBe(true);

      fireEvent.click(showSeconds);

      expect(showSeconds.checked).toBe(false);
    });

    it("can toggle hour24 checkbox", async () => {
      const client = createMockDesktopClient();

      await renderAndLoad(client);

      const hour24 = screen.getByLabelText("24時間表記") as HTMLInputElement;

      // Default is true
      expect(hour24.checked).toBe(true);

      fireEvent.click(hour24);

      expect(hour24.checked).toBe(false);
    });

    it("can toggle showDate checkbox", async () => {
      const client = createMockDesktopClient();

      await renderAndLoad(client);

      const showDate = screen.getByLabelText("日付を表示") as HTMLInputElement;

      // Default is false
      expect(showDate.checked).toBe(false);

      fireEvent.click(showDate);

      expect(showDate.checked).toBe(true);
    });

    it("can toggle alwaysOnTop checkbox", async () => {
      const client = createMockDesktopClient();

      await renderAndLoad(client);

      const alwaysOnTop = screen.getByLabelText("常に最前面") as HTMLInputElement;

      // Default is true
      expect(alwaysOnTop.checked).toBe(true);

      fireEvent.click(alwaysOnTop);

      expect(alwaysOnTop.checked).toBe(false);
    });
  });

  describe("save", () => {
    it("calls applySettings with edited values on form submit", async () => {
      const client = createMockDesktopClient();

      await renderAndLoad(client);

      // Edit: toggle showSeconds off and showDate on
      fireEvent.click(screen.getByLabelText("秒を表示"));
      fireEvent.click(screen.getByLabelText("日付を表示"));

      // Submit form
      const saveButton = screen.getByRole("button", { name: "保存" });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(client.applySettings).toHaveBeenCalledTimes(1);
      expect(client.applySettings).toHaveBeenCalledWith({
        ...DEFAULT_CLOCK_SETTINGS,
        showSeconds: false,
        showDate: true,
      });
    });

    it("updates applied settings baseline after successful save", async () => {
      const savedSettings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        showSeconds: false,
      };

      const client = createMockDesktopClient({
        applySettings: vi.fn(() =>
          Promise.resolve({
            settings: savedSettings,
            persistence: "saved" as const,
          }),
        ),
      });

      await renderAndLoad(client);

      fireEvent.click(screen.getByLabelText("秒を表示"));

      const saveButton = screen.getByRole("button", { name: "保存" });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Verify the form still reflects the saved state
      const showSeconds = screen.getByLabelText("秒を表示") as HTMLInputElement;

      expect(showSeconds.checked).toBe(false);
    });

    it("disables save button while saving", async () => {
      let resolveApply!: (value: SettingsChangedPayload) => void;

      const client = createMockDesktopClient({
        applySettings: vi.fn(
          () =>
            new Promise<SettingsChangedPayload>((resolve) => {
              resolveApply = resolve;
            }),
        ),
      });

      await renderAndLoad(client);

      const saveButton = screen.getByRole("button", { name: "保存" });

      // Start save
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(saveButton).toBeDisabled();

      // Resolve the save
      await act(async () => {
        resolveApply({
          settings: DEFAULT_CLOCK_SETTINGS,
          persistence: "saved" as const,
        });
      });

      expect(saveButton).not.toBeDisabled();
    });
  });

  describe("settings event sync", () => {
    it("syncs alwaysOnTop from external event but preserves other edits", async () => {
      const client = createMockDesktopClient();

      const { rerender } = await renderAndLoad(client);

      // User edits: turn off showSeconds
      fireEvent.click(screen.getByLabelText("秒を表示"));

      const showSeconds = screen.getByLabelText("秒を表示") as HTMLInputElement;

      expect(showSeconds.checked).toBe(false);

      // External event: alwaysOnTop toggled off (e.g., from clock menu)
      settingsEventPayload = {
        settings: { ...DEFAULT_CLOCK_SETTINGS, alwaysOnTop: false },
        persistence: "saved" as const,
      };

      rerender(<SettingsApp desktopClient={client} />);

      // alwaysOnTop should be synced to the new value
      const alwaysOnTop = screen.getByLabelText("常に最前面") as HTMLInputElement;

      expect(alwaysOnTop.checked).toBe(false);

      // showSeconds edit should be preserved
      const showSecondsAfter = screen.getByLabelText("秒を表示") as HTMLInputElement;

      expect(showSecondsAfter.checked).toBe(false);
    });

    it("updates persistence state from external event", async () => {
      const client = createMockDesktopClient();

      const { rerender } = await renderAndLoad(client);

      // External event with volatile persistence
      settingsEventPayload = {
        settings: { ...DEFAULT_CLOCK_SETTINGS, alwaysOnTop: false },
        persistence: "volatile" as const,
      };

      rerender(<SettingsApp desktopClient={client} />);

      // Should show volatile indicator
      expect(screen.getByTestId("volatile-indicator")).toBeInTheDocument();
    });
  });

  describe("volatile state", () => {
    it("shows unsaved indicator when persistence is volatile", async () => {
      const client = createMockDesktopClient({
        getAppliedSettings: vi.fn(() =>
          Promise.resolve({
            settings: DEFAULT_CLOCK_SETTINGS,
            persistence: "volatile" as const,
          }),
        ),
      });

      await renderAndLoad(client);

      expect(screen.getByTestId("volatile-indicator")).toBeInTheDocument();
    });

    it("does not show unsaved indicator when persistence is saved", async () => {
      const client = createMockDesktopClient();

      await renderAndLoad(client);

      expect(screen.queryByTestId("volatile-indicator")).not.toBeInTheDocument();
    });

    it("shows retry button when persistence is volatile", async () => {
      const client = createMockDesktopClient({
        getAppliedSettings: vi.fn(() =>
          Promise.resolve({
            settings: DEFAULT_CLOCK_SETTINGS,
            persistence: "volatile" as const,
          }),
        ),
      });

      await renderAndLoad(client);

      expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
    });
  });

  describe("retry persistence", () => {
    it("calls retrySettingsPersistence when retry button is clicked", async () => {
      const client = createMockDesktopClient({
        getAppliedSettings: vi.fn(() =>
          Promise.resolve({
            settings: DEFAULT_CLOCK_SETTINGS,
            persistence: "volatile" as const,
          }),
        ),
      });

      await renderAndLoad(client);

      const retryButton = screen.getByRole("button", { name: "再試行" });

      await act(async () => {
        fireEvent.click(retryButton);
      });

      expect(client.retrySettingsPersistence).toHaveBeenCalledTimes(1);
    });

    it("updates persistence to saved after successful retry", async () => {
      const client = createMockDesktopClient({
        getAppliedSettings: vi.fn(() =>
          Promise.resolve({
            settings: DEFAULT_CLOCK_SETTINGS,
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

      await renderAndLoad(client);

      expect(screen.getByTestId("volatile-indicator")).toBeInTheDocument();

      const retryButton = screen.getByRole("button", { name: "再試行" });

      await act(async () => {
        fireEvent.click(retryButton);
      });

      expect(screen.queryByTestId("volatile-indicator")).not.toBeInTheDocument();
    });
  });

  describe("save with volatile result", () => {
    it("shows volatile indicator when save returns volatile persistence", async () => {
      const client = createMockDesktopClient({
        applySettings: vi.fn((settings: ClockSettings) =>
          Promise.resolve({
            settings,
            persistence: "volatile" as const,
          }),
        ),
      });

      await renderAndLoad(client);

      const saveButton = screen.getByRole("button", { name: "保存" });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(screen.getByTestId("volatile-indicator")).toBeInTheDocument();
    });
  });
});
