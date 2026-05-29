import type { DatePattern, DateSeparator } from "../domain/settings";

function padTwo(value: number): string {
  return value.toString().padStart(2, "0");
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function formatDate(now: Date, pattern: DatePattern, separator: DateSeparator): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekday = WEEKDAYS[now.getDay()]!;
  const mm = padTwo(month);
  const dd = padTwo(day);
  const s = separator;

  switch (pattern) {
    case "ymd":        return `${year}${s}${mm}${s}${dd}`;
    case "md":         return `${mm}${s}${dd}`;
    case "japanese":   return `${month}月${day}日`;
    case "md-weekday": return `${month}${s}${day} ${weekday}`;
    case "dmy":        return `${dd}${s}${mm}${s}${year}`;
  }
}

export function formatTimeDigits(
  hours: number,
  minutes: number,
  seconds: number,
  showSeconds: boolean,
  colonVisible: boolean = true
): string {
  const sep = colonVisible ? ":" : " ";
  const timeParts = [hours.toString(), padTwo(minutes)];

  if (showSeconds) {
    return timeParts.join(":") + ":" + padTwo(seconds);
  }

  return timeParts.join(sep);
}
