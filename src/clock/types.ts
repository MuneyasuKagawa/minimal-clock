import type { ClockSettings } from "../domain/settings";

export interface ClockViewProps {
  now: Date;
  settings: ClockSettings;
}
