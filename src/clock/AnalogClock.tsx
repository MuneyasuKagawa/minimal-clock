import type { CSSProperties } from "react";
import type { DatePosition } from "../domain/settings";
import { formatDate } from "./format";
import type { ClockViewProps } from "./types";

type LayoutInfo = { direction: "column" | "row"; dateFirst: boolean; align: CSSProperties["alignItems"] };

const DATE_LAYOUTS: Record<DatePosition, LayoutInfo> = {
  "top":          { direction: "column", dateFirst: true,  align: "center" },
  "top-right":    { direction: "row",    dateFirst: false, align: "flex-start" },
  "right":        { direction: "row",    dateFirst: false, align: "center" },
  "bottom-right": { direction: "row",    dateFirst: false, align: "flex-end" },
  "bottom":       { direction: "column", dateFirst: false, align: "center" },
  "bottom-left":  { direction: "row",    dateFirst: true,  align: "flex-end" },
  "left":         { direction: "row",    dateFirst: true,  align: "center" },
  "top-left":     { direction: "row",    dateFirst: true,  align: "flex-start" },
};

const CENTER = 50;
const FACE_RADIUS = 45;

const HOUR_NUMBER_RADIUS = 36;

const HOUR_HAND_LENGTH = 25;
const MINUTE_HAND_LENGTH = 35;
const SECOND_HAND_LENGTH = 38;

const HOUR_HAND_WIDTH = 3;
const MINUTE_HAND_WIDTH = 2;
const SECOND_HAND_WIDTH = 1.2;

const DEGREES_PER_HOUR = 30;
const DEGREES_PER_MINUTE = 6;
const DEGREES_PER_SECOND = 6;
const DEGREES_PER_MINUTE_ON_HOUR = 0.5;
const DEGREES_PER_SECOND_ON_MINUTE = 0.1;

function computeHourDegrees(hours: number, minutes: number): number {
  const normalizedHours = hours % 12;

  return normalizedHours * DEGREES_PER_HOUR + minutes * DEGREES_PER_MINUTE_ON_HOUR;
}

function computeMinuteDegrees(minutes: number, seconds: number): number {
  return minutes * DEGREES_PER_MINUTE + seconds * DEGREES_PER_SECOND_ON_MINUTE;
}

function computeSecondDegrees(seconds: number): number {
  return seconds * DEGREES_PER_SECOND;
}

export function AnalogClock({ now, settings }: ClockViewProps) {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourDegrees = computeHourDegrees(hours, minutes);
  const minuteDegrees = computeMinuteDegrees(minutes, seconds);
  const secondDegrees = computeSecondDegrees(seconds);

  return (
    <div data-testid="analog-clock-container" style={{
      display: "flex",
      flexDirection: settings.showDate ? DATE_LAYOUTS[settings.datePosition].direction : "column",
      alignItems: settings.showDate ? DATE_LAYOUTS[settings.datePosition].align : "center",
      gap: "2px",
    }}>
      {settings.showDate && DATE_LAYOUTS[settings.datePosition].dateFirst && (
        <span data-testid="analog-date" style={{ fontSize: `${settings.dateSize}px`, fontWeight: settings.dateFontWeight, letterSpacing: `${settings.dateLetterSpacing / 100}em`, marginRight: `${-settings.dateLetterSpacing / 100}em`, opacity: 0.7, whiteSpace: "nowrap" }}>
          {formatDate(now, settings.datePattern, settings.dateSeparator)}
        </span>
      )}
      <svg
        data-testid="analog-clock"
        width={settings.clockSize * 5}
        height={settings.clockSize * 5}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          data-testid="analog-bg"
          cx={CENTER}
          cy={CENTER}
          r={FACE_RADIUS}
          fill={settings.showBorder || settings.bgColor === "transparent" ? "none" : settings.bgColor}
          fillOpacity={settings.showBorder ? 0 : settings.bgOpacity / 100}
          stroke={settings.showClockFace ? "currentColor" : "none"}
          strokeWidth="1"
        />

        {settings.clockStyle === "analog-numbers" &&
          Array.from({ length: 12 }, (_, i) => {
            const hour = i + 1;
            const angle = (hour * 30 - 90) * (Math.PI / 180);
            const x = CENTER + HOUR_NUMBER_RADIUS * Math.cos(angle);
            const y = CENTER + HOUR_NUMBER_RADIUS * Math.sin(angle);
            return (
              <text
                key={hour}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="currentColor"
                fontSize="9"
              >
                {hour}
              </text>
            );
          })}

        {settings.clockStyle === "analog-markers" &&
          Array.from({ length: 12 }, (_, i) => {
            const angle = (i * 30) * (Math.PI / 180);
            const x1 = CENTER + 40 * Math.sin(angle);
            const y1 = CENTER - 40 * Math.cos(angle);
            const x2 = CENTER + FACE_RADIUS * Math.sin(angle);
            const y2 = CENTER - FACE_RADIUS * Math.cos(angle);
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="currentColor"
                strokeWidth={i % 3 === 0 ? 2 : 1}
              />
            );
          })}

        <line
          data-testid="analog-hour-hand"
          x1={CENTER}
          y1={CENTER}
          x2={CENTER}
          y2={CENTER - HOUR_HAND_LENGTH}
          stroke="currentColor"
          strokeWidth={HOUR_HAND_WIDTH}
          strokeLinecap="round"
          transform={`rotate(${hourDegrees}, ${CENTER}, ${CENTER})`}
        />

        <line
          data-testid="analog-minute-hand"
          x1={CENTER}
          y1={CENTER}
          x2={CENTER}
          y2={CENTER - MINUTE_HAND_LENGTH}
          stroke="currentColor"
          strokeWidth={MINUTE_HAND_WIDTH}
          strokeLinecap="round"
          transform={`rotate(${minuteDegrees}, ${CENTER}, ${CENTER})`}
        />

        {settings.showSeconds && (
          <line
            data-testid="analog-second-hand"
            x1={CENTER}
            y1={CENTER}
            x2={CENTER}
            y2={CENTER - SECOND_HAND_LENGTH}
            stroke="#ff6b6b"
            strokeWidth={SECOND_HAND_WIDTH}
            strokeLinecap="round"
            transform={`rotate(${secondDegrees}, ${CENTER}, ${CENTER})`}
          />
        )}

        <circle
          cx={CENTER}
          cy={CENTER}
          r="2"
          fill="currentColor"
        />
      </svg>

      {settings.showDate && !DATE_LAYOUTS[settings.datePosition].dateFirst && (
        <span data-testid="analog-date" style={{ fontSize: `${settings.dateSize}px`, fontWeight: settings.dateFontWeight, letterSpacing: `${settings.dateLetterSpacing / 100}em`, marginRight: `${-settings.dateLetterSpacing / 100}em`, opacity: 0.7, whiteSpace: "nowrap" }}>
          {formatDate(now, settings.datePattern, settings.dateSeparator)}
        </span>
      )}
    </div>
  );
}
