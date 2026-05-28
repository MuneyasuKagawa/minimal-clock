import { formatDate } from "./format";
import type { ClockViewProps } from "./types";

const CENTER = 50;
const FACE_RADIUS = 45;

const HOUR_HAND_LENGTH = 25;
const MINUTE_HAND_LENGTH = 35;
const SECOND_HAND_LENGTH = 38;

const HOUR_HAND_WIDTH = 3;
const MINUTE_HAND_WIDTH = 2;
const SECOND_HAND_WIDTH = 1;

const DEGREES_PER_HOUR = 30;
const DEGREES_PER_MINUTE = 6;
const DEGREES_PER_SECOND = 6;
const DEGREES_PER_MINUTE_ON_HOUR = 0.5;
const DEGREES_PER_SECOND_ON_MINUTE = 0.1;

function computeHourDegrees(hours: number, minutes: number): number {
  const normalizedHours = hours % 12;

  return normalizedHours * DEGREES_PER_HOUR + minutes * DEGREES_PER_MINUTE_ON_HOUR;
}

function computeMinuteDegrees(minutes: number, seconds: number, showSeconds: boolean): number {
  const baseDegrees = minutes * DEGREES_PER_MINUTE;

  return showSeconds
    ? baseDegrees + seconds * DEGREES_PER_SECOND_ON_MINUTE
    : baseDegrees;
}

function computeSecondDegrees(seconds: number): number {
  return seconds * DEGREES_PER_SECOND;
}

export function AnalogClock({ now, settings }: ClockViewProps) {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourDegrees = computeHourDegrees(hours, minutes);
  const minuteDegrees = computeMinuteDegrees(minutes, seconds, settings.showSeconds);
  const secondDegrees = computeSecondDegrees(seconds);

  return (
    <div data-testid="analog-clock-container">
      <svg
        data-testid="analog-clock"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          data-testid="analog-face"
          cx={CENTER}
          cy={CENTER}
          r={FACE_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />

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
            stroke="currentColor"
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

      {settings.showDate && (
        <span data-testid="analog-date">{formatDate(now)}</span>
      )}
    </div>
  );
}
