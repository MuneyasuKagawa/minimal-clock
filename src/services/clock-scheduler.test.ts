import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createClockScheduler } from "./clock-scheduler";

function iso(value: Date): string {
  return value.toISOString();
}

describe("ClockScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("notifies at second boundaries when seconds are visible", async () => {
    vi.setSystemTime(new Date("2026-05-28T12:34:56.250Z"));
    const scheduler = createClockScheduler();
    const onTick = vi.fn();

    const stop = scheduler.start({ showSeconds: true, visible: true }, onTick);

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(iso(onTick.mock.calls[0]?.[0] as Date)).toBe("2026-05-28T12:34:56.250Z");

    await vi.advanceTimersByTimeAsync(749);
    expect(onTick).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(onTick).toHaveBeenCalledTimes(2);
    expect(iso(onTick.mock.calls[1]?.[0] as Date)).toBe("2026-05-28T12:34:57.000Z");

    await vi.advanceTimersByTimeAsync(1_000);
    expect(onTick).toHaveBeenCalledTimes(3);
    expect(iso(onTick.mock.calls[2]?.[0] as Date)).toBe("2026-05-28T12:34:58.000Z");

    stop();
  });

  it("notifies only at minute boundaries when seconds are hidden", async () => {
    vi.setSystemTime(new Date("2026-05-28T12:34:10.500Z"));
    const scheduler = createClockScheduler();
    const onTick = vi.fn();

    const stop = scheduler.start({ showSeconds: false, visible: true }, onTick);

    expect(onTick).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(49_499);
    expect(onTick).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(onTick).toHaveBeenCalledTimes(2);
    expect(iso(onTick.mock.calls[1]?.[0] as Date)).toBe("2026-05-28T12:35:00.000Z");

    await vi.advanceTimersByTimeAsync(59_999);
    expect(onTick).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(onTick).toHaveBeenCalledTimes(3);
    expect(iso(onTick.mock.calls[2]?.[0] as Date)).toBe("2026-05-28T12:36:00.000Z");

    stop();
  });

  it("does not notify while hidden", async () => {
    vi.setSystemTime(new Date("2026-05-28T12:34:56.250Z"));
    const scheduler = createClockScheduler();
    const onTick = vi.fn();

    const stop = scheduler.start({ showSeconds: true, visible: false }, onTick);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(onTick).not.toHaveBeenCalled();

    scheduler.restart({ showSeconds: false, visible: false });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(onTick).not.toHaveBeenCalled();

    stop();
  });

  it("stops hidden timers and resynchronizes immediately when visible again", async () => {
    vi.setSystemTime(new Date("2026-05-28T12:34:56.250Z"));
    const scheduler = createClockScheduler();
    const onTick = vi.fn();

    const stop = scheduler.start({ showSeconds: true, visible: true }, onTick);
    expect(onTick).toHaveBeenCalledTimes(1);

    scheduler.restart({ showSeconds: true, visible: false });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(onTick).toHaveBeenCalledTimes(1);

    scheduler.restart({ showSeconds: false, visible: true });
    expect(onTick).toHaveBeenCalledTimes(2);
    expect(iso(onTick.mock.calls[1]?.[0] as Date)).toBe("2026-05-28T12:35:01.250Z");

    await vi.advanceTimersByTimeAsync(58_749);
    expect(onTick).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(onTick).toHaveBeenCalledTimes(3);
    expect(iso(onTick.mock.calls[2]?.[0] as Date)).toBe("2026-05-28T12:36:00.000Z");

    stop();
  });
});
