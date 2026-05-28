import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { SettingsApp } from "./settings/SettingsApp";
import "./styles/settings.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>
);
