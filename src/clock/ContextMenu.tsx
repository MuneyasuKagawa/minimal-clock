import type { ClockSettings } from "../domain/settings";
import type { DesktopClient } from "../services/desktop-client";

interface ContextMenuProps {
  settings: ClockSettings;
  desktopClient: DesktopClient;
  onClose: () => void;
}

export function ContextMenu({ settings, desktopClient, onClose }: ContextMenuProps) {
  const handleSettings = () => {
    desktopClient.openSettingsWindow();
    onClose();
  };

  const handleAlwaysOnTopToggle = () => {
    const toggled: ClockSettings = {
      ...settings,
      alwaysOnTop: !settings.alwaysOnTop,
    };

    desktopClient.applySettings(toggled);
    onClose();
  };

  const handleQuit = () => {
    desktopClient.quitApplication();
    onClose();
  };

  return (
    <div
      data-testid="context-menu"
      className="context-menu"
      role="menu"
    >
      <button
        data-testid="context-menu-settings"
        className="context-menu-item"
        role="menuitem"
        onClick={handleSettings}
      >
        設定
      </button>
      <button
        data-testid="context-menu-always-on-top"
        className="context-menu-item"
        role="menuitem"
        aria-checked={settings.alwaysOnTop}
        onClick={handleAlwaysOnTopToggle}
      >
        {settings.alwaysOnTop ? "✓ " : ""}最前面
      </button>
      <button
        data-testid="context-menu-quit"
        className="context-menu-item"
        role="menuitem"
        onClick={handleQuit}
      >
        終了
      </button>
    </div>
  );
}
