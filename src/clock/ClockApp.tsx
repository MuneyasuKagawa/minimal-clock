import { useCallback, useEffect, useRef, useState } from "react";

import type { ClockSettings } from "../domain/settings";
import { createClockScheduler, type ClockScheduler } from "../services/clock-scheduler";
import { createDesktopClient, type DesktopClient } from "../services/desktop-client";
import { useSettingsEvent } from "../services/use-settings-event";
import { useVisibilityEvent } from "../services/use-visibility-event";
import { AnalogClock } from "./AnalogClock";
import { ContextMenu } from "./ContextMenu";
import { DigitalClock } from "./DigitalClock";

interface ClockAppProps {
  desktopClient?: DesktopClient;
}

export function ClockApp({ desktopClient }: ClockAppProps) {
  const client = useRef(desktopClient ?? createDesktopClient()).current;
  const schedulerRef = useRef<ClockScheduler | null>(null);

  const [settings, setSettings] = useState<ClockSettings | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const settingsEvent = useSettingsEvent();
  const visibilityEvent = useVisibilityEvent();

  // Derive effective visibility: default to true until an event says otherwise
  const visible = visibilityEvent ?? true;

  // --- Initialization ---
  useEffect(() => {
    let cancelled = false;

    client.initializeClockWindow().then((payload) => {
      if (!cancelled) {
        setSettings(payload.settings);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [client]);

  // --- Settings change from events ---
  useEffect(() => {
    if (settingsEvent === null) {
      return;
    }

    setSettings(settingsEvent.settings);
  }, [settingsEvent]);

  // --- Scheduler lifecycle ---
  useEffect(() => {
    if (settings === null) {
      return;
    }

    const scheduler = createClockScheduler();
    schedulerRef.current = scheduler;

    const stop = scheduler.start(
      { showSeconds: settings.showSeconds, visible },
      (tick) => {
        setNow(tick);
      },
    );

    return () => {
      schedulerRef.current = null;
      stop();
    };
    // Intentionally depends only on settings — visibility changes are
    // handled by the restart effect below, avoiding full scheduler recreation.
  }, [settings]);

  // --- Restart scheduler on settings or visibility change ---
  useEffect(() => {
    if (settings === null || schedulerRef.current === null) {
      return;
    }

    schedulerRef.current.restart({
      showSeconds: settings.showSeconds,
      visible,
    });
  }, [settings, visible]);

  // --- Context menu ---
  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setMenuOpen(true);
    },
    [],
  );

  const handleMenuClose = useCallback(() => {
    setMenuOpen(false);
  }, []);

  // --- Render ---
  const renderClock = () => {
    if (settings === null || now === null) {
      return null;
    }

    if (settings.mode === "analog") {
      return <AnalogClock now={now} settings={settings} />;
    }

    return <DigitalClock now={now} settings={settings} />;
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
      {menuOpen && settings !== null && (
        <ContextMenu
          settings={settings}
          desktopClient={client}
          onClose={handleMenuClose}
        />
      )}
    </main>
  );
}
