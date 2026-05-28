import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ClockApp } from "./clock/ClockApp";
import "./styles/clock.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClockApp />
  </StrictMode>
);
