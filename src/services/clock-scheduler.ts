export interface ClockScheduleOptions {
  showSeconds: boolean;
  visible: boolean;
}

export interface ClockScheduler {
  start(options: ClockScheduleOptions, onTick: (now: Date) => void): () => void;
  restart(options: ClockScheduleOptions): void;
}

type TimerId = ReturnType<typeof setTimeout>;

function millisecondsUntilNextSecond(now: Date): number {
  const elapsedMilliseconds = now.getMilliseconds();

  return elapsedMilliseconds === 0 ? 1_000 : 1_000 - elapsedMilliseconds;
}

function millisecondsUntilNextMinute(now: Date): number {
  const elapsedMilliseconds =
    now.getSeconds() * 1_000 + now.getMilliseconds();

  return elapsedMilliseconds === 0 ? 60_000 : 60_000 - elapsedMilliseconds;
}

function millisecondsUntilNextBoundary(now: Date, showSeconds: boolean): number {
  return showSeconds ? millisecondsUntilNextSecond(now) : millisecondsUntilNextMinute(now);
}

export function createClockScheduler(): ClockScheduler {
  let options: ClockScheduleOptions | null = null;
  let onTick: ((now: Date) => void) | null = null;
  let timer: TimerId | null = null;
  let running = false;

  function clearActiveTimer(): void {
    if (timer === null) {
      return;
    }

    clearTimeout(timer);
    timer = null;
  }

  function scheduleNextTick(): void {
    clearActiveTimer();

    if (!running || options === null || onTick === null || !options.visible) {
      return;
    }

    timer = setTimeout(() => {
      if (options === null || onTick === null || !options.visible) {
        timer = null;
        return;
      }

      onTick(new Date());
      scheduleNextTick();
    }, millisecondsUntilNextBoundary(new Date(), options.showSeconds));
  }

  function emitCurrentTime(): void {
    if (onTick === null) {
      return;
    }

    onTick(new Date());
  }

  return {
    start(nextOptions, nextOnTick) {
      running = true;
      options = nextOptions;
      onTick = nextOnTick;

      if (options.visible) {
        emitCurrentTime();
      }

      scheduleNextTick();

      return () => {
        running = false;
        options = null;
        onTick = null;
        clearActiveTimer();
      };
    },
    restart(nextOptions) {
      const wasVisible = options?.visible ?? false;

      options = nextOptions;

      if (running && !wasVisible && options.visible) {
        emitCurrentTime();
      }

      scheduleNextTick();
    }
  };
}
