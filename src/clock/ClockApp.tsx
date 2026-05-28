export function ClockApp() {
  return (
    <main
      data-testid="clock-page"
      data-tauri-drag-region
      className="clock-container"
      aria-label="時計"
    >
      <span>Clock</span>
    </main>
  );
}
