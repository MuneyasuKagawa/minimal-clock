import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CLOCK_SETTINGS, type ClockSettings } from "../domain/settings";
import type { DesktopClient } from "../services/desktop-client";
import { ContextMenu } from "./ContextMenu";

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

function renderContextMenu(
  overrides: {
    settings?: ClockSettings;
    desktopClient?: DesktopClient;
    onClose?: () => void;
  } = {},
) {
  const settings = overrides.settings ?? DEFAULT_CLOCK_SETTINGS;
  const desktopClient = overrides.desktopClient ?? createMockDesktopClient();
  const onClose = overrides.onClose ?? vi.fn();

  return {
    ...render(
      <ContextMenu
        settings={settings}
        desktopClient={desktopClient}
        onClose={onClose}
      />,
    ),
    desktopClient,
    onClose,
  };
}

// --- Tests ---

describe("ContextMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("menu items", () => {
    it("renders 3 menu items: 設定, 最前面, 終了", () => {
      renderContextMenu();

      expect(screen.getByTestId("context-menu-settings")).toHaveTextContent("設定");
      expect(screen.getByTestId("context-menu-always-on-top")).toBeInTheDocument();
      expect(screen.getByTestId("context-menu-quit")).toHaveTextContent("終了");
    });

    it("renders the menu container with context-menu testid", () => {
      renderContextMenu();

      expect(screen.getByTestId("context-menu")).toBeInTheDocument();
    });
  });

  describe("settings action", () => {
    it("calls openSettingsWindow when settings item is clicked", () => {
      const { desktopClient, onClose } = renderContextMenu();

      fireEvent.click(screen.getByTestId("context-menu-settings"));

      expect(desktopClient.openSettingsWindow).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("quit action", () => {
    it("calls quitApplication when quit item is clicked", () => {
      const { desktopClient, onClose } = renderContextMenu();

      fireEvent.click(screen.getByTestId("context-menu-quit"));

      expect(desktopClient.quitApplication).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("always on top state", () => {
    it("shows checked indicator when alwaysOnTop is true", () => {
      const settings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        alwaysOnTop: true,
      };

      renderContextMenu({ settings });

      const item = screen.getByTestId("context-menu-always-on-top");

      expect(item).toHaveTextContent("✓");
      expect(item).toHaveTextContent("最前面");
    });

    it("does not show checked indicator when alwaysOnTop is false", () => {
      const settings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        alwaysOnTop: false,
      };

      renderContextMenu({ settings });

      const item = screen.getByTestId("context-menu-always-on-top");

      expect(item).not.toHaveTextContent("✓");
      expect(item).toHaveTextContent("最前面");
    });
  });

  describe("always on top toggle", () => {
    it("calls applySettings with toggled alwaysOnTop when clicked (true -> false)", () => {
      const settings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        alwaysOnTop: true,
      };
      const { desktopClient, onClose } = renderContextMenu({ settings });

      fireEvent.click(screen.getByTestId("context-menu-always-on-top"));

      expect(desktopClient.applySettings).toHaveBeenCalledTimes(1);
      expect(desktopClient.applySettings).toHaveBeenCalledWith({
        ...settings,
        alwaysOnTop: false,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls applySettings with toggled alwaysOnTop when clicked (false -> true)", () => {
      const settings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        alwaysOnTop: false,
      };
      const { desktopClient, onClose } = renderContextMenu({ settings });

      fireEvent.click(screen.getByTestId("context-menu-always-on-top"));

      expect(desktopClient.applySettings).toHaveBeenCalledTimes(1);
      expect(desktopClient.applySettings).toHaveBeenCalledWith({
        ...settings,
        alwaysOnTop: true,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("onClose callback", () => {
    it("calls onClose after settings action", () => {
      const { onClose } = renderContextMenu();

      fireEvent.click(screen.getByTestId("context-menu-settings"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose after quit action", () => {
      const { onClose } = renderContextMenu();

      fireEvent.click(screen.getByTestId("context-menu-quit"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose after always-on-top toggle", () => {
      const { onClose } = renderContextMenu();

      fireEvent.click(screen.getByTestId("context-menu-always-on-top"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it("has role menu on the container", () => {
      renderContextMenu();

      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("has role menuitem on each item", () => {
      renderContextMenu();

      const items = screen.getAllByRole("menuitem");

      expect(items).toHaveLength(3);
    });

    it("has aria-checked on always-on-top item when active", () => {
      const settings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        alwaysOnTop: true,
      };

      renderContextMenu({ settings });

      const item = screen.getByTestId("context-menu-always-on-top");

      expect(item).toHaveAttribute("aria-checked", "true");
    });

    it("has aria-checked false on always-on-top item when inactive", () => {
      const settings: ClockSettings = {
        ...DEFAULT_CLOCK_SETTINGS,
        alwaysOnTop: false,
      };

      renderContextMenu({ settings });

      const item = screen.getByTestId("context-menu-always-on-top");

      expect(item).toHaveAttribute("aria-checked", "false");
    });
  });
});
