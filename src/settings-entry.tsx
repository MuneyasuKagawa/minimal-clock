import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import { SettingsApp } from "./settings/SettingsApp";
import "./styles/settings.css";

function hideWindow() {
  getCurrentWebviewWindow().hide().catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SettingsApp onClose={hideWindow} />
  </StrictMode>
);
