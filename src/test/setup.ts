import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock("@tauri-apps/api/dpi", () => ({
  LogicalSize: class LogicalSize { constructor(public width: number, public height: number) {} },
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    hide: () => Promise.resolve(),
    setSize: () => Promise.resolve(),
  }),
}));

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: () => Promise.resolve(null),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  ask: () => Promise.resolve(false),
}));

vi.mock("@tauri-apps/api/menu", () => ({
  Menu: { new: () => Promise.resolve({ popup: () => Promise.resolve() }) },
  MenuItem: { new: (opts: Record<string, unknown>) => Promise.resolve(opts) },
  CheckMenuItem: { new: (opts: Record<string, unknown>) => Promise.resolve(opts) },
  PredefinedMenuItem: { new: (opts: Record<string, unknown>) => Promise.resolve(opts) },
}));

afterEach(() => {
  cleanup();
});
