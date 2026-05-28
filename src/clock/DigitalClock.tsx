import { formatDate, formatTimeDigits } from "./format";
import type { ClockViewProps } from "./types";

function getPeriod(now: Date): "AM" | "PM" {
  return now.getHours() < 12 ? "AM" : "PM";
}

export function DigitalClock({ now, settings }: ClockViewProps) {
  const hours = now.getHours();
  const displayHours = settings.hour24 ? hours : hours % 12 || 12;

  const timeText = formatTimeDigits(
    displayHours,
    now.getMinutes(),
    now.getSeconds(),
    settings.showSeconds
  );

  return (
    <div data-testid="digital-clock">
      <span data-testid="digital-time">{timeText}</span>
      {!settings.hour24 && (
        <span data-testid="digital-period">{getPeriod(now)}</span>
      )}
      {settings.showDate && (
        <span data-testid="digital-date">{formatDate(now)}</span>
      )}
    </div>
  );
}
