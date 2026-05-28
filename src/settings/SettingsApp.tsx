import { useEffect, useRef, useState } from "react";

import type { SettingsPersistence } from "../domain/events";
import type { ClockMode, ClockSettings } from "../domain/settings";
import { createDesktopClient, type DesktopClient } from "../services/desktop-client";
import { useSettingsEvent } from "../services/use-settings-event";

interface SettingsAppProps {
  desktopClient?: DesktopClient;
}

export function SettingsApp({ desktopClient }: SettingsAppProps) {
  const client = useRef(desktopClient ?? createDesktopClient()).current;

  const appliedSettingsRef = useRef<ClockSettings | null>(null);
  const [editSettings, setEditSettings] = useState<ClockSettings | null>(null);
  const [persistence, setPersistence] = useState<SettingsPersistence | null>(null);
  const [saving, setSaving] = useState(false);

  const settingsEvent = useSettingsEvent();

  // --- Load settings on mount ---
  useEffect(() => {
    let cancelled = false;

    client.getAppliedSettings().then((payload) => {
      if (!cancelled) {
        appliedSettingsRef.current = payload.settings;
        setEditSettings(payload.settings);
        setPersistence(payload.persistence);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [client]);

  // --- Sync from external settings events ---
  useEffect(() => {
    if (settingsEvent === null) {
      return;
    }

    appliedSettingsRef.current = settingsEvent.settings;
    setPersistence(settingsEvent.persistence);

    // Sync alwaysOnTop to the edit form but preserve other edits
    setEditSettings((prev) => {
      if (prev === null) {
        return settingsEvent.settings;
      }

      return {
        ...prev,
        alwaysOnTop: settingsEvent.settings.alwaysOnTop,
      };
    });
  }, [settingsEvent]);

  // --- Handlers ---
  const handleModeChange = (mode: ClockMode) => {
    setEditSettings((prev) => (prev === null ? prev : { ...prev, mode }));
  };

  const handleCheckboxChange = (field: keyof Omit<ClockSettings, "mode">) => {
    setEditSettings((prev) =>
      prev === null ? prev : { ...prev, [field]: !prev[field] },
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (editSettings === null || saving) {
      return;
    }

    setSaving(true);

    client.applySettings(editSettings).then((payload) => {
      appliedSettingsRef.current = payload.settings;
      setEditSettings(payload.settings);
      setPersistence(payload.persistence);
      setSaving(false);
    });
  };

  const handleRetry = () => {
    client.retrySettingsPersistence().then((payload) => {
      appliedSettingsRef.current = payload.settings;
      setEditSettings(payload.settings);
      setPersistence(payload.persistence);
    });
  };

  // --- Render ---
  const renderForm = () => {
    if (editSettings === null) {
      return null;
    }

    return (
      <form onSubmit={handleSave} className="settings-form">
        <fieldset className="settings-fieldset">
          <legend className="settings-legend">表示モード</legend>
          <div className="settings-radio-group">
            <label className="settings-radio-label">
              <input
                type="radio"
                name="mode"
                value="digital"
                checked={editSettings.mode === "digital"}
                onChange={() => handleModeChange("digital")}
              />
              デジタル
            </label>
            <label className="settings-radio-label">
              <input
                type="radio"
                name="mode"
                value="analog"
                checked={editSettings.mode === "analog"}
                onChange={() => handleModeChange("analog")}
              />
              アナログ
            </label>
          </div>
        </fieldset>

        <div className="settings-checkbox-group">
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={editSettings.showSeconds}
              onChange={() => handleCheckboxChange("showSeconds")}
            />
            秒を表示
          </label>

          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={editSettings.hour24}
              onChange={() => handleCheckboxChange("hour24")}
            />
            24時間表記
          </label>

          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={editSettings.showDate}
              onChange={() => handleCheckboxChange("showDate")}
            />
            日付を表示
          </label>

          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={editSettings.alwaysOnTop}
              onChange={() => handleCheckboxChange("alwaysOnTop")}
            />
            常に最前面
          </label>
        </div>

        <div className="settings-actions">
          <button type="submit" className="settings-save-button" disabled={saving}>
            保存
          </button>
        </div>
      </form>
    );
  };

  const renderVolatileIndicator = () => {
    if (persistence !== "volatile") {
      return null;
    }

    return (
      <div data-testid="volatile-indicator" className="settings-volatile">
        <span className="settings-volatile-text">未保存の設定があります</span>
        <button
          type="button"
          className="settings-retry-button"
          onClick={handleRetry}
        >
          再試行
        </button>
      </div>
    );
  };

  return (
    <main data-testid="settings-page" aria-label="設定" className="settings-container">
      <h1 className="settings-title">設定</h1>
      {renderVolatileIndicator()}
      {renderForm()}
    </main>
  );
}
