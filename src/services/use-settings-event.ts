import { useEffect, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import {
  CLOCK_SETTINGS_CHANGED_EVENT,
  isSettingsChangedPayload,
  type SettingsChangedPayload,
} from "../domain/events";

export function useSettingsEvent(): SettingsChangedPayload | null {
  const [payload, setPayload] = useState<SettingsChangedPayload | null>(null);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let cancelled = false;

    listen<unknown>(CLOCK_SETTINGS_CHANGED_EVENT, (event) => {
      if (!cancelled && isSettingsChangedPayload(event.payload)) {
        setPayload(event.payload);
      }
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return payload;
}
