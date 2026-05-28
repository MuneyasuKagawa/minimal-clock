import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ClockSettings } from "../domain/settings";
import { AnalogClock } from "./AnalogClock";

function createSettings(overrides: Partial<ClockSettings> = {}): ClockSettings {
  return {
    mode: "analog",
    showSeconds: true,
    hour24: true,
    showDate: false,
    alwaysOnTop: true,
    ...overrides
  };
}

describe("AnalogClock", () => {
  describe("clock face", () => {
    it("renders an SVG element", () => {
      const now = new Date(2026, 4, 28, 3, 0, 0);

      render(<AnalogClock now={now} settings={createSettings()} />);

      const svg = screen.getByTestId("analog-clock");
      expect(svg.tagName.toLowerCase()).toBe("svg");
    });

    it("renders the clock face circle", () => {
      const now = new Date(2026, 4, 28, 3, 0, 0);

      render(<AnalogClock now={now} settings={createSettings()} />);

      const face = screen.getByTestId("analog-face");
      expect(face.tagName.toLowerCase()).toBe("circle");
    });
  });

  describe("hour hand", () => {
    it("renders the hour hand", () => {
      const now = new Date(2026, 4, 28, 3, 0, 0);

      render(<AnalogClock now={now} settings={createSettings()} />);

      const hourHand = screen.getByTestId("analog-hour-hand");
      expect(hourHand).toBeInTheDocument();
    });

    it("rotates the hour hand based on hours and minutes", () => {
      // 3:00 => 90 degrees (3/12 * 360)
      const now = new Date(2026, 4, 28, 3, 0, 0);

      render(<AnalogClock now={now} settings={createSettings()} />);

      const hourHand = screen.getByTestId("analog-hour-hand");
      const transform = hourHand.getAttribute("transform");
      // 3 hours = 90 degrees
      expect(transform).toContain("rotate(90");
    });

    it("accounts for minutes in hour hand rotation", () => {
      // 3:30 => 90 + 15 = 105 degrees
      const now = new Date(2026, 4, 28, 3, 30, 0);

      render(<AnalogClock now={now} settings={createSettings()} />);

      const hourHand = screen.getByTestId("analog-hour-hand");
      const transform = hourHand.getAttribute("transform");
      expect(transform).toContain("rotate(105");
    });
  });

  describe("minute hand", () => {
    it("renders the minute hand", () => {
      const now = new Date(2026, 4, 28, 3, 0, 0);

      render(<AnalogClock now={now} settings={createSettings()} />);

      const minuteHand = screen.getByTestId("analog-minute-hand");
      expect(minuteHand).toBeInTheDocument();
    });

    it("rotates the minute hand based on minutes", () => {
      // 15 minutes => 90 degrees (15/60 * 360)
      const now = new Date(2026, 4, 28, 3, 15, 0);

      render(<AnalogClock now={now} settings={createSettings()} />);

      const minuteHand = screen.getByTestId("analog-minute-hand");
      const transform = minuteHand.getAttribute("transform");
      expect(transform).toContain("rotate(90");
    });

    it("accounts for seconds in minute hand rotation", () => {
      // 15 minutes 30 seconds => 90 + 3 = 93 degrees
      const now = new Date(2026, 4, 28, 3, 15, 30);

      render(<AnalogClock now={now} settings={createSettings()} />);

      const minuteHand = screen.getByTestId("analog-minute-hand");
      const transform = minuteHand.getAttribute("transform");
      expect(transform).toContain("rotate(93");
    });
  });

  describe("second hand", () => {
    it("renders the second hand when showSeconds is true", () => {
      const now = new Date(2026, 4, 28, 3, 0, 0);

      render(<AnalogClock now={now} settings={createSettings({ showSeconds: true })} />);

      const secondHand = screen.getByTestId("analog-second-hand");
      expect(secondHand).toBeInTheDocument();
    });

    it("does not render the second hand when showSeconds is false", () => {
      const now = new Date(2026, 4, 28, 3, 0, 0);

      render(<AnalogClock now={now} settings={createSettings({ showSeconds: false })} />);

      expect(screen.queryByTestId("analog-second-hand")).toBeNull();
    });

    it("rotates the second hand based on seconds", () => {
      // 15 seconds => 90 degrees (15/60 * 360)
      const now = new Date(2026, 4, 28, 3, 0, 15);

      render(<AnalogClock now={now} settings={createSettings({ showSeconds: true })} />);

      const secondHand = screen.getByTestId("analog-second-hand");
      const transform = secondHand.getAttribute("transform");
      expect(transform).toContain("rotate(90");
    });

    it("rotates the second hand for 45 seconds correctly", () => {
      // 45 seconds => 270 degrees (45/60 * 360)
      const now = new Date(2026, 4, 28, 3, 0, 45);

      render(<AnalogClock now={now} settings={createSettings({ showSeconds: true })} />);

      const secondHand = screen.getByTestId("analog-second-hand");
      const transform = secondHand.getAttribute("transform");
      expect(transform).toContain("rotate(270");
    });
  });

  describe("date display", () => {
    it("shows date when showDate is true", () => {
      const now = new Date(2026, 4, 28, 14, 30, 45);

      render(<AnalogClock now={now} settings={createSettings({ showDate: true })} />);

      expect(screen.getByTestId("analog-date")).toHaveTextContent("2026/05/28");
    });

    it("does not show date when showDate is false", () => {
      const now = new Date(2026, 4, 28, 14, 30, 45);

      render(<AnalogClock now={now} settings={createSettings({ showDate: false })} />);

      expect(screen.queryByTestId("analog-date")).toBeNull();
    });
  });

  describe("12-hour and 24-hour wrapping", () => {
    it("wraps hours beyond 12 for the hour hand", () => {
      // 15:00 (3 PM) => same position as 3:00 => 90 degrees
      const now = new Date(2026, 4, 28, 15, 0, 0);

      render(<AnalogClock now={now} settings={createSettings()} />);

      const hourHand = screen.getByTestId("analog-hour-hand");
      const transform = hourHand.getAttribute("transform");
      expect(transform).toContain("rotate(90");
    });

    it("positions hour hand at 0 degrees for 12 o'clock", () => {
      // 12:00 => 0 degrees (12 % 12 = 0)
      const now = new Date(2026, 4, 28, 12, 0, 0);

      render(<AnalogClock now={now} settings={createSettings()} />);

      const hourHand = screen.getByTestId("analog-hour-hand");
      const transform = hourHand.getAttribute("transform");
      expect(transform).toContain("rotate(0");
    });

    it("positions minute hand at 0 degrees for 0 minutes", () => {
      const now = new Date(2026, 4, 28, 3, 0, 0);

      render(<AnalogClock now={now} settings={createSettings()} />);

      const minuteHand = screen.getByTestId("analog-minute-hand");
      const transform = minuteHand.getAttribute("transform");
      expect(transform).toContain("rotate(0");
    });
  });

  describe("does not render minute hand seconds influence when seconds hidden", () => {
    it("minute hand ignores seconds when showSeconds is false", () => {
      // 15 minutes 30 seconds, but showSeconds false => 90 degrees (no seconds contribution)
      const now = new Date(2026, 4, 28, 3, 15, 30);

      render(<AnalogClock now={now} settings={createSettings({ showSeconds: false })} />);

      const minuteHand = screen.getByTestId("analog-minute-hand");
      const transform = minuteHand.getAttribute("transform");
      expect(transform).toContain("rotate(90");
    });
  });
});
