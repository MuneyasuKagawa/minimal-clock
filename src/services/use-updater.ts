import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { ask } from "@tauri-apps/plugin-dialog";

export function useUpdater() {
  useEffect(() => {
    (async () => {
      try {
        const update = await check();
        if (!update) return;
        const yes = await ask(
          `v${update.version} が利用可能です。今すぐ更新しますか？`,
          { title: "アップデート", kind: "info", okLabel: "更新", cancelLabel: "後で" }
        );
        if (yes) {
          await update.downloadAndInstall();
        }
      } catch (e) {
        console.error("[updater]", e);
      }
    })();
  }, []);
}
