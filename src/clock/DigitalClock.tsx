import { formatDate } from "./format";
import type { ClockViewProps } from "./types";

function padTwo(value: number): string {
  return value.toString().padStart(2, "0");
}

function getPeriod(now: Date): "AM" | "PM" {
  return now.getHours() < 12 ? "AM" : "PM";
}

export function DigitalClock({ now, settings }: ClockViewProps) {
  const hours = now.getHours();
  const displayHours = settings.hour24 ? hours : hours % 12 || 12;
  const shouldBlink = settings.blinkColon && !settings.showSeconds;
  const colonOpacity = shouldBlink && now.getSeconds() % 2 !== 0 ? 0 : 1;

  const dateElement = settings.showDate ? (
    <span
      data-testid="digital-date"
      style={{
        fontSize: `${settings.dateSize}px`,
        fontWeight: settings.dateFontWeight,
        letterSpacing: `${settings.dateLetterSpacing / 100}em`,
        marginRight: `${-settings.dateLetterSpacing / 100}em`
      }}
    >
      {formatDate(now, settings.datePattern, settings.dateSeparator)}
    </span>
  ) : null;

  const pos = settings.datePosition;
  const isVertical = pos === "top" || pos === "bottom" || pos === "top-left" || pos === "top-right" || pos === "bottom-left" || pos === "bottom-right";
  const dateFirst = pos === "left" || pos === "top" || pos === "top-left" || pos === "top-right" || pos === "bottom-left";

  return (
    <div data-testid="digital-clock" style={{ display: "flex", flexDirection: isVertical ? "column" : "row", alignItems: "center", gap: isVertical ? "2px" : "6px", fontVariantNumeric: "tabular-nums", fontSize: `${settings.clockSize}px`, fontFamily: "'SF Pro Display', 'Helvetica Neue', 'Segoe UI', sans-serif", letterSpacing: `${settings.letterSpacing / 100}em`, fontWeight: settings.fontWeight }}>
      {dateFirst && dateElement}
      <span data-testid="digital-time" style={{ display: "inline-flex", alignItems: "baseline" }}>
        {displayHours}
        <span style={{ opacity: colonOpacity, padding: "0 0.05em" }}>:</span>
        {padTwo(now.getMinutes())}
        {settings.showSeconds && (
          <>
            <span style={{ padding: "0 0.05em" }}>:</span>
            {padTwo(now.getSeconds())}
          </>
        )}
      </span>
      {!settings.hour24 && (
        <span data-testid="digital-period" style={{ fontSize: "0.7em" }}>{getPeriod(now)}</span>
      )}
      {!dateFirst && dateElement}
    </div>
  );
}
