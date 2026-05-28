import { useEffect, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import {
  CLOCK_WINDOW_VISIBILITY_EVENT,
  isClockWindowVisibilityPayload,
} from "../domain/events";

export function useVisibilityEvent(): boolean | null {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let cancelled = false;

    listen<unknown>(CLOCK_WINDOW_VISIBILITY_EVENT, (event) => {
      if (!cancelled && isClockWindowVisibilityPayload(event.payload)) {
        setVisible(event.payload.visible);
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

  return visible;
}
