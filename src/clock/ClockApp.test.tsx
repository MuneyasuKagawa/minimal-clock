import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClockApp } from "./ClockApp";

describe("ClockApp", () => {
  describe("drag region", () => {
    it("has data-tauri-drag-region attribute on the clock container", () => {
      render(<ClockApp />);

      const container = screen.getByTestId("clock-page");

      expect(container).toHaveAttribute("data-tauri-drag-region");
    });
  });

  describe("accessibility", () => {
    it("has aria-label for the clock page", () => {
      render(<ClockApp />);

      const container = screen.getByTestId("clock-page");

      expect(container).toHaveAttribute("aria-label", "時計");
    });
  });

  describe("styling container", () => {
    it("has the clock-container class for CSS styling", () => {
      render(<ClockApp />);

      const container = screen.getByTestId("clock-page");

      expect(container).toHaveClass("clock-container");
    });
  });
});
