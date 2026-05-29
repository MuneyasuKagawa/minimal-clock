import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_CLOCK_SETTINGS, type ClockSettings } from "../domain/settings";
import { DigitalClock } from "./DigitalClock";

function createSettings(overrides: Partial<ClockSettings> = {}): ClockSettings {
  return { ...DEFAULT_CLOCK_SETTINGS, ...overrides };
}

describe("DigitalClock", () => {
  describe("24-hour format", () => {
    it("displays time in 24-hour format with seconds", () => {
      const now = new Date(2026, 4, 28, 14, 30, 45);

      render(<DigitalClock now={now} settings={createSettings({ hour24: true, showSeconds: true })} />);

      expect(screen.getByTestId("digital-time")).toHaveTextContent("14:30:45");
    });

    it("displays time in 24-hour format without seconds", () => {
      const now = new Date(2026, 4, 28, 14, 30, 45);

      render(<DigitalClock now={now} settings={createSettings({ hour24: true, showSeconds: false })} />);

      expect(screen.getByTestId("digital-time")).toHaveTextContent("14:30");
      expect(screen.getByTestId("digital-time").textContent).not.toContain("45");
    });

    it("displays midnight as 0:00 in 24-hour format", () => {
      const now = new Date(2026, 4, 28, 0, 5, 9);

      render(<DigitalClock now={now} settings={createSettings({ hour24: true, showSeconds: true })} />);

      expect(screen.getByTestId("digital-time")).toHaveTextContent("0:05:09");
    });

    it("pads minutes and seconds with leading zeros", () => {
      const now = new Date(2026, 4, 28, 9, 3, 7);

      render(<DigitalClock now={now} settings={createSettings({ hour24: true, showSeconds: true })} />);

      expect(screen.getByTestId("digital-time")).toHaveTextContent("9:03:07");
    });
  });

  describe("12-hour format", () => {
    it("displays afternoon time with PM indicator", () => {
      const now = new Date(2026, 4, 28, 14, 30, 45);

      render(<DigitalClock now={now} settings={createSettings({ hour24: false, showSeconds: true })} />);

      expect(screen.getByTestId("digital-time")).toHaveTextContent("2:30:45");
      expect(screen.getByTestId("digital-period")).toHaveTextContent("PM");
    });

    it("displays morning time with AM indicator", () => {
      const now = new Date(2026, 4, 28, 9, 15, 30);

      render(<DigitalClock now={now} settings={createSettings({ hour24: false, showSeconds: true })} />);

      expect(screen.getByTestId("digital-time")).toHaveTextContent("9:15:30");
      expect(screen.getByTestId("digital-period")).toHaveTextContent("AM");
    });

    it("displays 12-hour format without seconds", () => {
      const now = new Date(2026, 4, 28, 14, 30, 45);

      render(<DigitalClock now={now} settings={createSettings({ hour24: false, showSeconds: false })} />);

      expect(screen.getByTestId("digital-time")).toHaveTextContent("2:30");
      expect(screen.getByTestId("digital-time").textContent).not.toContain("45");
      expect(screen.getByTestId("digital-period")).toHaveTextContent("PM");
    });

    it("displays noon as 12 PM", () => {
      const now = new Date(2026, 4, 28, 12, 0, 0);

      render(<DigitalClock now={now} settings={createSettings({ hour24: false, showSeconds: false })} />);

      expect(screen.getByTestId("digital-time")).toHaveTextContent("12:00");
      expect(screen.getByTestId("digital-period")).toHaveTextContent("PM");
    });

    it("displays midnight as 12 AM", () => {
      const now = new Date(2026, 4, 28, 0, 0, 0);

      render(<DigitalClock now={now} settings={createSettings({ hour24: false, showSeconds: false })} />);

      expect(screen.getByTestId("digital-time")).toHaveTextContent("12:00");
      expect(screen.getByTestId("digital-period")).toHaveTextContent("AM");
    });
  });

  describe("date display", () => {
    it("shows date when showDate is true", () => {
      const now = new Date(2026, 4, 28, 14, 30, 45);

      render(<DigitalClock now={now} settings={createSettings({ showDate: true })} />);

      expect(screen.getByTestId("digital-date")).toHaveTextContent("2026/05/28");
    });

    it("does not show date when showDate is false", () => {
      const now = new Date(2026, 4, 28, 14, 30, 45);

      render(<DigitalClock now={now} settings={createSettings({ showDate: false })} />);

      expect(screen.queryByTestId("digital-date")).toBeNull();
    });
  });

  describe("AM/PM indicator", () => {
    it("does not show period indicator in 24-hour mode", () => {
      const now = new Date(2026, 4, 28, 14, 30, 45);

      render(<DigitalClock now={now} settings={createSettings({ hour24: true })} />);

      expect(screen.queryByTestId("digital-period")).toBeNull();
    });
  });
});
