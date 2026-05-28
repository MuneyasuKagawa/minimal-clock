import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_CLOCK_SETTINGS } from "../domain/settings";
import type { DesktopClient } from "../services/desktop-client";
import { ClockApp } from "../clock/ClockApp";
import { SettingsApp } from "../settings/SettingsApp";

vi.mock("../services/use-settings-event", () => ({
  useSettingsEvent: () => null,
}));

vi.mock("../services/use-visibility-event", () => ({
  useVisibilityEvent: () => null,
}));

vi.mock("../services/clock-scheduler", () => ({
  createClockScheduler: () => ({
    start: () => () => {},
    restart: () => {},
  }),
}));

function createStubDesktopClient(): DesktopClient {
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
    applySettings: vi.fn(() =>
      Promise.resolve({
        settings: DEFAULT_CLOCK_SETTINGS,
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
  };
}

describe("frontend entry scaffolding", () => {
  it("provides a clock page root", () => {
    const client = createStubDesktopClient();

    render(<ClockApp desktopClient={client} />);

    expect(screen.getByTestId("clock-page")).toBeInTheDocument();
  });

  it("provides a settings page root", () => {
    const client = createStubDesktopClient();

    render(<SettingsApp desktopClient={client} />);

    expect(screen.getByTestId("settings-page")).toBeInTheDocument();
  });
});
