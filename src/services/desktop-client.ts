import { invoke } from "@tauri-apps/api/core";

import type { ClockSettings } from "../domain/settings";
import type { SettingsChangedPayload } from "../domain/events";

export type DesktopCommandError =
  | { kind: "window-unavailable"; operation: string }
  | { kind: "runtime-failure"; operation: string; message: string };

export interface DesktopClient {
  initializeClockWindow(): Promise<SettingsChangedPayload>;
  openSettingsWindow(): Promise<void>;
  getAppliedSettings(): Promise<SettingsChangedPayload>;
  applySettings(settings: ClockSettings): Promise<SettingsChangedPayload>;
  retrySettingsPersistence(): Promise<SettingsChangedPayload>;
  quitApplication(): Promise<void>;
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error === null || error === undefined) {
    return "Unknown error";
  }

  return String(error);
}

function toDesktopCommandError(operation: string, error: unknown): DesktopCommandError {
  return {
    kind: "runtime-failure",
    operation,
    message: extractErrorMessage(error)
  };
}

export function createDesktopClient(): DesktopClient {
  return {
    async initializeClockWindow(): Promise<SettingsChangedPayload> {
      try {
        return await invoke<SettingsChangedPayload>("initialize_clock_window");
      } catch (error: unknown) {
        throw toDesktopCommandError("initializeClockWindow", error);
      }
    },

    async openSettingsWindow(): Promise<void> {
      try {
        await invoke<void>("open_settings_window");
      } catch (error: unknown) {
        throw toDesktopCommandError("openSettingsWindow", error);
      }
    },

    async getAppliedSettings(): Promise<SettingsChangedPayload> {
      try {
        return await invoke<SettingsChangedPayload>("get_applied_settings");
      } catch (error: unknown) {
        throw toDesktopCommandError("getAppliedSettings", error);
      }
    },

    async applySettings(settings: ClockSettings): Promise<SettingsChangedPayload> {
      try {
        return await invoke<SettingsChangedPayload>("apply_settings", { settings });
      } catch (error: unknown) {
        throw toDesktopCommandError("applySettings", error);
      }
    },

    async retrySettingsPersistence(): Promise<SettingsChangedPayload> {
      try {
        return await invoke<SettingsChangedPayload>("retry_settings_persistence");
      } catch (error: unknown) {
        throw toDesktopCommandError("retrySettingsPersistence", error);
      }
    },

    async quitApplication(): Promise<void> {
      try {
        await invoke<void>("quit_application");
      } catch (error: unknown) {
        throw toDesktopCommandError("quitApplication", error);
      }
    }
  };
}
