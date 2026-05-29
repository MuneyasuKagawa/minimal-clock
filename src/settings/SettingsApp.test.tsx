import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SettingsChangedPayload } from "../domain/events";
import { DEFAULT_CLOCK_SETTINGS, type ClockSettings } from "../domain/settings";
import type { DesktopClient } from "../services/desktop-client";
import { SettingsApp } from "./SettingsApp";

let settingsEventPayload: SettingsChangedPayload | null = null;

vi.mock("../services/use-settings-event", () => ({
  useSettingsEvent: () => settingsEventPayload,
}));

function createMockDesktopClient(
  overrides: Partial<DesktopClient> = {},
): DesktopClient {
  return {
    initializeClockWindow: vi.fn(() =>
      Promise.resolve({ settings: DEFAULT_CLOCK_SETTINGS, persistence: "saved" as const }),
    ),
    openSettingsWindow: vi.fn(() => Promise.resolve()),
    getAppliedSettings: vi.fn(() =>
      Promise.resolve({ settings: DEFAULT_CLOCK_SETTINGS, persistence: "saved" as const }),
    ),
    applySettings: vi.fn((settings: ClockSettings) =>
      Promise.resolve({ settings, persistence: "saved" as const }),
    ),
    retrySettingsPersistence: vi.fn(() =>
      Promise.resolve({ settings: DEFAULT_CLOCK_SETTINGS, persistence: "saved" as const }),
    ),
    quitApplication: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

async function renderAndInit(client: DesktopClient) {
  const result = render(<SettingsApp desktopClient={client} />);
  await act(async () => {});
  return result;
}

describe("SettingsApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsEventPayload = null;
  });

  describe("initialization", () => {
    it("calls getAppliedSettings on mount", async () => {
      const client = createMockDesktopClient();
      await renderAndInit(client);
      expect(client.getAppliedSettings).toHaveBeenCalledTimes(1);
    });

    it("renders the settings page root with aria-label", async () => {
      const client = createMockDesktopClient();
      await renderAndInit(client);
      const page = screen.getByTestId("settings-page");
      expect(page).toHaveAttribute("aria-label", "設定");
    });

    it("renders tabs", async () => {
      const client = createMockDesktopClient();
      await renderAndInit(client);
      expect(screen.getByText("スタイル")).toBeInTheDocument();
      expect(screen.getByText("表示")).toBeInTheDocument();
      expect(screen.getByText("外観")).toBeInTheDocument();
    });
  });

  describe("settings changes", () => {
    it("calls applySettings when a checkbox is toggled", async () => {
      const client = createMockDesktopClient();
      await renderAndInit(client);

      // Switch to 表示 tab
      await act(async () => {
        screen.getByText("表示").click();
      });

      const checkbox = screen.getByLabelText("秒を表示");
      await act(async () => {
        checkbox.click();
      });

      expect(client.applySettings).toHaveBeenCalledWith(
        expect.objectContaining({ showSeconds: false }),
      );
    });
  });

  describe("settings event sync", () => {
    it("syncs alwaysOnTop from external events", async () => {
      const client = createMockDesktopClient();
      const { rerender } = await renderAndInit(client);

      settingsEventPayload = {
        settings: { ...DEFAULT_CLOCK_SETTINGS, alwaysOnTop: false },
        persistence: "saved",
      };

      rerender(<SettingsApp desktopClient={client} />);

      // Switch to 外観 tab to check
      await act(async () => {
        screen.getByText("外観").click();
      });

      const checkbox = screen.getByLabelText("常に最前面");
      expect(checkbox).not.toBeChecked();
    });
  });

  describe("volatile state", () => {
    it("shows volatile indicator when persistence is volatile", async () => {
      const client = createMockDesktopClient({
        getAppliedSettings: vi.fn(() =>
          Promise.resolve({ settings: DEFAULT_CLOCK_SETTINGS, persistence: "volatile" as const }),
        ),
      });
      await renderAndInit(client);
      expect(screen.getByTestId("volatile-indicator")).toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("calls onClose when close button is clicked", async () => {
      const client = createMockDesktopClient();
      const onClose = vi.fn();
      render(<SettingsApp desktopClient={client} onClose={onClose} />);
      await act(async () => {});
      screen.getByText("✕").click();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
