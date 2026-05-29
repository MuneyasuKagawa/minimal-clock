export const CLOCK_STYLES = [
  "digital",
  "analog-simple",
  "analog-numbers",
  "analog-markers"
] as const;

export type ClockStyle = (typeof CLOCK_STYLES)[number];

export const DATE_POSITIONS = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"] as const;

export type DatePosition = (typeof DATE_POSITIONS)[number];

export const DATE_PATTERNS = ["ymd", "md", "japanese", "md-weekday", "dmy"] as const;

export type DatePattern = (typeof DATE_PATTERNS)[number];

export const DATE_SEPARATORS = ["/", ".", "-"] as const;

export type DateSeparator = (typeof DATE_SEPARATORS)[number];

export interface ClockSettings {
  clockStyle: ClockStyle;
  clockSize: number;
  fontWeight: number;
  letterSpacing: number;
  showSeconds: boolean;
  hour24: boolean;
  showDate: boolean;
  datePattern: DatePattern;
  dateSeparator: DateSeparator;
  datePosition: DatePosition;
  dateSize: number;
  dateFontWeight: number;
  dateLetterSpacing: number;
  blinkColon: boolean;
  showBorder: boolean;
  showClockFace: boolean;
  bgColor: string;
  bgOpacity: number;
  clockOpacity: number;
  alwaysOnTop: boolean;
}

export const DEFAULT_CLOCK_SETTINGS: ClockSettings = {
  clockStyle: "digital",
  clockSize: 16,
  fontWeight: 300,
  letterSpacing: 8,
  showSeconds: true,
  hour24: true,
  showDate: false,
  datePattern: "ymd",
  dateSeparator: "/",
  datePosition: "bottom",
  dateSize: 10,
  dateFontWeight: 300,
  dateLetterSpacing: 8,
  blinkColon: false,
  showBorder: true,
  showClockFace: true,
  bgColor: "#181820",
  bgOpacity: 75,
  clockOpacity: 100,
  alwaysOnTop: true
};

const CLOCK_SETTINGS_KEYS = [
  "clockStyle",
  "clockSize",
  "fontWeight",
  "letterSpacing",
  "showSeconds",
  "hour24",
  "showDate",
  "datePattern",
  "dateSeparator",
  "datePosition",
  "dateSize",
  "dateFontWeight",
  "dateLetterSpacing",
  "blinkColon",
  "showBorder",
  "showClockFace",
  "bgColor",
  "bgOpacity",
  "clockOpacity",
  "alwaysOnTop"
] as const satisfies readonly (keyof ClockSettings)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyClockSettingsKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);

  return (
    keys.length === CLOCK_SETTINGS_KEYS.length &&
    CLOCK_SETTINGS_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

export function isClockStyle(value: unknown): value is ClockStyle {
  return CLOCK_STYLES.includes(value as ClockStyle);
}

export function isDatePosition(value: unknown): value is DatePosition {
  return DATE_POSITIONS.includes(value as DatePosition);
}

export function isDatePattern(value: unknown): value is DatePattern {
  return DATE_PATTERNS.includes(value as DatePattern);
}

export function isDateSeparator(value: unknown): value is DateSeparator {
  return DATE_SEPARATORS.includes(value as DateSeparator);
}

export function isClockSettings(value: unknown): value is ClockSettings {
  return (
    isRecord(value) &&
    hasOnlyClockSettingsKeys(value) &&
    isClockStyle(value.clockStyle) &&
    typeof value.clockSize === "number" &&
    typeof value.fontWeight === "number" &&
    typeof value.letterSpacing === "number" &&
    typeof value.showSeconds === "boolean" &&
    typeof value.hour24 === "boolean" &&
    typeof value.showDate === "boolean" &&
    isDatePattern(value.datePattern) &&
    isDateSeparator(value.dateSeparator) &&
    isDatePosition(value.datePosition) &&
    typeof value.dateSize === "number" &&
    typeof value.dateFontWeight === "number" &&
    typeof value.dateLetterSpacing === "number" &&
    typeof value.blinkColon === "boolean" &&
    typeof value.showBorder === "boolean" &&
    typeof value.showClockFace === "boolean" &&
    typeof value.bgColor === "string" &&
    typeof value.bgOpacity === "number" &&
    typeof value.clockOpacity === "number" &&
    typeof value.alwaysOnTop === "boolean"
  );
}
