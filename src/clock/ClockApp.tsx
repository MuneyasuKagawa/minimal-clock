import { useCallback, useEffect, useRef, useState } from "react";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import type { ClockSettings } from "../domain/settings";
import { createClockScheduler, type ClockScheduler } from "../services/clock-scheduler";
import { createDesktopClient, type DesktopClient } from "../services/desktop-client";
import { useSettingsEvent } from "../services/use-settings-event";
import { useVisibilityEvent } from "../services/use-visibility-event";
import { showClockContextMenu } from "./context-menu-native";
import { AnalogClock } from "./AnalogClock";
import { DigitalClock } from "./DigitalClock";

interface ClockAppProps {
  desktopClient?: DesktopClient;
}

export function ClockApp({ desktopClient }: ClockAppProps) {
  const client = useRef(desktopClient ?? createDesktopClient()).current;
  const schedulerRef = useRef<ClockScheduler | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<ClockSettings | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const settingsEvent = useSettingsEvent();
  const visibilityEvent = useVisibilityEvent();

  const visible = visibilityEvent ?? true;

  useEffect(() => {
    let cancelled = false;

    client
      .initializeClockWindow()
      .then((payload) => {
        if (!cancelled) {
          setSettings(payload.settings);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    if (settingsEvent === null) {
      return;
    }
    setSettings(settingsEvent.settings);
  }, [settingsEvent]);

  useEffect(() => {
    if (settings === null) {
      return;
    }

    const scheduler = createClockScheduler();
    schedulerRef.current = scheduler;

    const needsSecondTick = settings.showSeconds || (settings.blinkColon && !settings.showSeconds);
    const stop = scheduler.start(
      { showSeconds: needsSecondTick, visible },
      (tick) => {
        setNow(tick);
      },
    );

    return () => {
      schedulerRef.current = null;
      stop();
    };
  }, [settings]);

  useEffect(() => {
    if (settings === null || schedulerRef.current === null) {
      return;
    }
    const needsSecondTick = settings.showSeconds || (settings.blinkColon && !settings.showSeconds);
    schedulerRef.current.restart({
      showSeconds: needsSecondTick,
      visible,
    });
  }, [settings, visible]);

  const hasTime = now !== null;
  useEffect(() => {
    if (settings === null || !hasTime || contentRef.current === null) {
      return;
    }
    const el = contentRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;
      const w = Math.ceil(entry.borderBoxSize[0]!.inlineSize) + 4;
      const h = Math.ceil(entry.borderBoxSize[0]!.blockSize) + 4;
      getCurrentWebviewWindow()
        .setSize(new LogicalSize(w, h))
        .catch(() => {});
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [settings, hasTime]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (settings !== null) {
        showClockContextMenu(settings, client);
      }
    },
    [settings, client],
  );

  const renderClock = () => {
    if (settings === null || now === null) {
      return null;
    }

    const clock =
      settings.clockStyle === "digital" ? (
        <DigitalClock now={now} settings={settings} />
      ) : (
        <AnalogClock now={now} settings={settings} />
      );

    const isLight = settings.bgColor === "#ffffff";
    const textColor = isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.92)";
    const isAnalog = settings.clockStyle !== "digital";
    const useCircleBg = !settings.showBorder && isAnalog;
    const alpha = settings.bgOpacity / 100;
    const bgWithAlpha = settings.bgColor === "transparent"
      ? "transparent"
      : `color-mix(in srgb, ${settings.bgColor} ${Math.round(alpha * 100)}%, transparent)`;

    const style: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none" as const,
      opacity: settings.clockOpacity / 100,
      background: useCircleBg ? "none" : bgWithAlpha,
      color: textColor,
      padding: settings.showBorder ? "6px 14px" : "4px 10px",
      borderRadius: settings.showBorder ? "8px" : "0",
      border: settings.showBorder ? `1px solid ${isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.3)"}` : "none",
    };

    return (
      <div ref={contentRef} data-tauri-drag-region style={style}>
        {clock}
      </div>
    );
  };

  return (
    <main
      data-testid="clock-page"
      data-tauri-drag-region
      className="clock-container"
      aria-label="時計"
      onContextMenu={handleContextMenu}
    >
      {renderClock()}
    </main>
  );
}
