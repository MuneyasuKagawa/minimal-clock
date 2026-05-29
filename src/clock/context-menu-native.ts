import { Menu, MenuItem, PredefinedMenuItem, CheckMenuItem } from "@tauri-apps/api/menu";

import type { ClockSettings } from "../domain/settings";
import type { DesktopClient } from "../services/desktop-client";

export async function showClockContextMenu(
  settings: ClockSettings,
  client: DesktopClient,
): Promise<void> {
  const settingsItem = await MenuItem.new({
    text: "設定",
    action: () => {
      client.openSettingsWindow().catch(() => {});
    },
  });

  const alwaysOnTopItem = await CheckMenuItem.new({
    text: "最前面",
    checked: settings.alwaysOnTop,
    action: () => {
      client
        .applySettings({ ...settings, alwaysOnTop: !settings.alwaysOnTop })
        .catch(() => {});
    },
  });

  const separator = await PredefinedMenuItem.new({ item: "Separator" });

  const quitItem = await MenuItem.new({
    text: "終了",
    action: () => {
      client.quitApplication().catch(() => {});
    },
  });

  const menu = await Menu.new({
    items: [settingsItem, alwaysOnTopItem, separator, quitItem],
  });

  await menu.popup().catch(() => {});
}
