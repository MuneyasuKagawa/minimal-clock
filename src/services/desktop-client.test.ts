import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CLOCK_SETTINGS, type ClockSettings } from "../domain/settings";
import type { SettingsChangedPayload } from "../domain/events";
import { createDesktopClient, type DesktopCommandError } from "./desktop-client";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

async function getInvokeMock(): Promise<ReturnType<typeof vi.fn>> {
  const { invoke } = await import("@tauri-apps/api/core");

  return invoke as unknown as ReturnType<typeof vi.fn>;
}

const SAVED_PAYLOAD: SettingsChangedPayload = {
  settings: DEFAULT_CLOCK_SETTINGS,
  persistence: "saved"
};

const VOLATILE_PAYLOAD: SettingsChangedPayload = {
  settings: { ...DEFAULT_CLOCK_SETTINGS, alwaysOnTop: false },
  persistence: "volatile"
};

describe("DesktopClient", () => {
  let invokeMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    invokeMock = await getInvokeMock();
  });

  describe("initializeClockWindow", () => {
    it("calls invoke with the correct command name and returns the payload", async () => {
      invokeMock.mockResolvedValueOnce(SAVED_PAYLOAD);
      const client = createDesktopClient();

      const result = await client.initializeClockWindow();

      expect(invokeMock).toHaveBeenCalledWith("initialize_clock_window");
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(SAVED_PAYLOAD);
    });

    it("maps invoke failure to DesktopCommandError with runtime-failure kind", async () => {
      invokeMock.mockRejectedValueOnce("Initialization failed");
      const client = createDesktopClient();

      const error = await client
        .initializeClockWindow()
        .catch((e: DesktopCommandError) => e);

      expect(error).toEqual({
        kind: "runtime-failure",
        operation: "initializeClockWindow",
        message: "Initialization failed"
      });
    });

    it("maps Error instance from invoke to runtime-failure", async () => {
      invokeMock.mockRejectedValueOnce(new Error("Window not found"));
      const client = createDesktopClient();

      const error = await client
        .initializeClockWindow()
        .catch((e: DesktopCommandError) => e);

      expect(error).toEqual({
        kind: "runtime-failure",
        operation: "initializeClockWindow",
        message: "Window not found"
      });
    });
  });

  describe("openSettingsWindow", () => {
    it("calls invoke with the correct command name and returns void", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      const client = createDesktopClient();

      const result = await client.openSettingsWindow();

      expect(invokeMock).toHaveBeenCalledWith("open_settings_window");
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it("maps invoke failure to DesktopCommandError", async () => {
      invokeMock.mockRejectedValueOnce("Settings window creation failed");
      const client = createDesktopClient();

      const error = await client
        .openSettingsWindow()
        .catch((e: DesktopCommandError) => e);

      expect(error).toEqual({
        kind: "runtime-failure",
        operation: "openSettingsWindow",
        message: "Settings window creation failed"
      });
    });
  });

  describe("getAppliedSettings", () => {
    it("calls invoke with the correct command name and returns the payload", async () => {
      invokeMock.mockResolvedValueOnce(VOLATILE_PAYLOAD);
      const client = createDesktopClient();

      const result = await client.getAppliedSettings();

      expect(invokeMock).toHaveBeenCalledWith("get_applied_settings");
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(VOLATILE_PAYLOAD);
    });

    it("maps invoke failure to DesktopCommandError", async () => {
      invokeMock.mockRejectedValueOnce("State unavailable");
      const client = createDesktopClient();

      const error = await client
        .getAppliedSettings()
        .catch((e: DesktopCommandError) => e);

      expect(error).toEqual({
        kind: "runtime-failure",
        operation: "getAppliedSettings",
        message: "State unavailable"
      });
    });
  });

  describe("applySettings", () => {
    const customSettings: ClockSettings = {
      ...DEFAULT_CLOCK_SETTINGS,
      clockStyle: "analog-simple",
      showSeconds: false,
      hour24: false,
      showDate: true,
    };

    const appliedPayload: SettingsChangedPayload = {
      settings: customSettings,
      persistence: "saved"
    };

    it("calls invoke with the correct command name and settings argument", async () => {
      invokeMock.mockResolvedValueOnce(appliedPayload);
      const client = createDesktopClient();

      const result = await client.applySettings(customSettings);

      expect(invokeMock).toHaveBeenCalledWith("apply_settings", {
        settings: customSettings
      });
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(appliedPayload);
    });

    it("returns volatile payload when persistence fails", async () => {
      const volatileResult: SettingsChangedPayload = {
        settings: customSettings,
        persistence: "volatile"
      };

      invokeMock.mockResolvedValueOnce(volatileResult);
      const client = createDesktopClient();

      const result = await client.applySettings(customSettings);

      expect(result.persistence).toBe("volatile");
      expect(result.settings).toEqual(customSettings);
    });

    it("maps invoke failure to DesktopCommandError", async () => {
      invokeMock.mockRejectedValueOnce("Apply failed");
      const client = createDesktopClient();

      const error = await client
        .applySettings(customSettings)
        .catch((e: DesktopCommandError) => e);

      expect(error).toEqual({
        kind: "runtime-failure",
        operation: "applySettings",
        message: "Apply failed"
      });
    });
  });

  describe("retrySettingsPersistence", () => {
    it("calls invoke with the correct command name and returns the payload", async () => {
      invokeMock.mockResolvedValueOnce(SAVED_PAYLOAD);
      const client = createDesktopClient();

      const result = await client.retrySettingsPersistence();

      expect(invokeMock).toHaveBeenCalledWith("retry_settings_persistence");
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(SAVED_PAYLOAD);
    });

    it("maps invoke failure to DesktopCommandError", async () => {
      invokeMock.mockRejectedValueOnce("Persistence retry failed");
      const client = createDesktopClient();

      const error = await client
        .retrySettingsPersistence()
        .catch((e: DesktopCommandError) => e);

      expect(error).toEqual({
        kind: "runtime-failure",
        operation: "retrySettingsPersistence",
        message: "Persistence retry failed"
      });
    });
  });

  describe("quitApplication", () => {
    it("calls invoke with the correct command name and returns void", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      const client = createDesktopClient();

      const result = await client.quitApplication();

      expect(invokeMock).toHaveBeenCalledWith("quit_application");
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it("maps invoke failure to DesktopCommandError", async () => {
      invokeMock.mockRejectedValueOnce("Quit failed");
      const client = createDesktopClient();

      const error = await client
        .quitApplication()
        .catch((e: DesktopCommandError) => e);

      expect(error).toEqual({
        kind: "runtime-failure",
        operation: "quitApplication",
        message: "Quit failed"
      });
    });
  });

  describe("error mapping for non-string, non-Error rejections", () => {
    it("maps unknown rejection value to a string message", async () => {
      invokeMock.mockRejectedValueOnce(42);
      const client = createDesktopClient();

      const error = await client
        .initializeClockWindow()
        .catch((e: DesktopCommandError) => e);

      expect(error).toEqual({
        kind: "runtime-failure",
        operation: "initializeClockWindow",
        message: "42"
      });
    });

    it("maps null rejection to fallback message", async () => {
      invokeMock.mockRejectedValueOnce(null);
      const client = createDesktopClient();

      const error = await client
        .openSettingsWindow()
        .catch((e: DesktopCommandError) => e);

      expect(error).toEqual({
        kind: "runtime-failure",
        operation: "openSettingsWindow",
        message: "Unknown error"
      });
    });
  });

  describe("factory creates independent instances", () => {
    it("returns separate client instances", () => {
      const client1 = createDesktopClient();
      const client2 = createDesktopClient();

      expect(client1).not.toBe(client2);
    });
  });
});
