function padTwo(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatDate(now: Date): string {
  const year = now.getFullYear();
  const month = padTwo(now.getMonth() + 1);
  const day = padTwo(now.getDate());

  return `${year}/${month}/${day}`;
}

export function formatTimeDigits(
  hours: number,
  minutes: number,
  seconds: number,
  showSeconds: boolean
): string {
  const timeParts = [hours.toString(), padTwo(minutes)];

  if (showSeconds) {
    timeParts.push(padTwo(seconds));
  }

  return timeParts.join(":");
}
