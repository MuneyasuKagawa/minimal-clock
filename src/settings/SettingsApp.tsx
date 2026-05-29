import { useCallback, useEffect, useRef, useState } from "react";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import type { SettingsPersistence } from "../domain/events";
import type { ClockSettings, ClockStyle, DatePattern, DatePosition, DateSeparator } from "../domain/settings";
import { CLOCK_STYLES, DATE_PATTERNS, DATE_SEPARATORS } from "../domain/settings";
import { createDesktopClient, type DesktopClient } from "../services/desktop-client";
import { useSettingsEvent } from "../services/use-settings-event";
import { StylePreview } from "./StylePreview";

interface SettingsAppProps {
  desktopClient?: DesktopClient;
  onClose?: () => void;
}

const STYLE_LABELS: Record<ClockStyle, string> = {
  "digital": "デジタル",
  "analog-simple": "シンプル",
  "analog-numbers": "数字",
  "analog-markers": "目盛り",
};

const TABS = ["スタイル", "表示", "外観"] as const;
type Tab = (typeof TABS)[number];

export function SettingsApp({ desktopClient, onClose }: SettingsAppProps) {
  const client = useRef(desktopClient ?? createDesktopClient()).current;

  const [settings, setSettings] = useState<ClockSettings | null>(null);
  const [persistence, setPersistence] = useState<SettingsPersistence | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("スタイル");

  const settingsEvent = useSettingsEvent();
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (containerRef.current === null) return;
    const el = containerRef.current;
    let lastH = 0;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;
      const h = Math.ceil(entry.borderBoxSize[0]!.blockSize) + 4;
      if (h !== lastH) {
        lastH = h;
        getCurrentWebviewWindow()
          .setSize(new LogicalSize(320, h))
          .catch(() => {});
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    client.getAppliedSettings().then((payload) => {
      if (!cancelled) {
        setSettings(payload.settings);
        setPersistence(payload.persistence);
      }
    });
    return () => { cancelled = true; };
  }, [client]);

  useEffect(() => {
    if (settingsEvent === null) return;
    setSettings(settingsEvent.settings);
    setPersistence(settingsEvent.persistence);
  }, [settingsEvent]);

  const applyChange = useCallback((next: ClockSettings) => {
    setSettings(next);
    client.applySettings(next).then((payload) => {
      setSettings(payload.settings);
      setPersistence(payload.persistence);
    });
  }, [client]);

  const handleToggle = (field: keyof ClockSettings) => {
    if (settings === null) return;
    applyChange({ ...settings, [field]: !settings[field as keyof typeof settings] });
  };

  if (settings === null) return null;

  return (
    <main ref={containerRef} data-testid="settings-page" aria-label="設定" className="settings-container" data-tauri-drag-region>
      <div className="settings-header" data-tauri-drag-region>
        <h1 className="settings-title" data-tauri-drag-region>設定</h1>
        <button type="button" className="settings-close-button" onClick={onClose}>✕</button>
      </div>

      {persistence === "volatile" && (
        <div data-testid="volatile-indicator" className="settings-volatile">
          <span className="settings-volatile-text">未保存の設定があります</span>
          <button type="button" className="settings-retry-button" onClick={() => {
            client.retrySettingsPersistence().then((p) => { setSettings(p.settings); setPersistence(p.persistence); });
          }}>再試行</button>
        </div>
      )}

      <div className="settings-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`settings-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >{tab}</button>
        ))}
      </div>

      <div className="settings-tab-content">
        {activeTab === "スタイル" && (
          <>
            <div className="settings-style-grid">
              {CLOCK_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`settings-style-option ${settings.clockStyle === style ? "selected" : ""}`}
                  onClick={() => applyChange({ ...settings, clockStyle: style })}
                >
                  <StylePreview style={style} />
                  <span className="settings-style-label">{STYLE_LABELS[style]}</span>
                </button>
              ))}
            </div>
            <label className="settings-range-label">
              サイズ: {settings.clockSize}
              <input type="range" min="10" max="40" value={settings.clockSize} onChange={(e) => applyChange({ ...settings, clockSize: Number(e.target.value) })} className="settings-range" />
            </label>
            {settings.clockStyle === "digital" && (
              <>
                <label className="settings-range-label">
                  太さ: {settings.fontWeight}
                  <input type="range" min="100" max="900" step="100" value={settings.fontWeight} onChange={(e) => applyChange({ ...settings, fontWeight: Number(e.target.value) })} className="settings-range" />
                </label>
                <label className="settings-range-label">
                  文字間隔: {settings.letterSpacing}
                  <input type="range" min="0" max="20" value={settings.letterSpacing} onChange={(e) => applyChange({ ...settings, letterSpacing: Number(e.target.value) })} className="settings-range" />
                </label>
              </>
            )}
          </>
        )}

        {activeTab === "表示" && (
          <div className="settings-checkbox-group">
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.showSeconds} onChange={() => handleToggle("showSeconds")} />
              秒を表示
            </label>
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.hour24} onChange={() => handleToggle("hour24")} />
              24時間表記
            </label>
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.blinkColon} onChange={() => handleToggle("blinkColon")} disabled={settings.showSeconds} />
              コロン点滅{settings.showSeconds ? "（秒表示時は無効）" : ""}
            </label>
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.showClockFace} onChange={() => handleToggle("showClockFace")} />
              文字盤の円を表示
            </label>

            <div className="settings-separator" />

            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.showDate} onChange={() => handleToggle("showDate")} />
              日付を表示
            </label>
            <label className="settings-checkbox-label">
              日付パターン
              <select value={settings.datePattern} onChange={(e) => applyChange({ ...settings, datePattern: e.target.value as DatePattern })} className="settings-select">
                {DATE_PATTERNS.map((p) => (
                  <option key={p} value={p}>
                    {p === "ymd" ? "年月日" : p === "md" ? "月日" : p === "japanese" ? "M月d日" : p === "md-weekday" ? "月日 曜" : "日月年"}
                  </option>
                ))}
              </select>
            </label>
            {settings.datePattern !== "japanese" && (
              <div className="settings-separator-group">
                <span style={{ fontSize: "13px" }}>区切り文字</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {DATE_SEPARATORS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`settings-position-btn ${settings.dateSeparator === s ? "selected" : ""}`}
                      style={{ width: "36px", fontSize: "14px" }}
                      onClick={() => applyChange({ ...settings, dateSeparator: s as DateSeparator })}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}
            <label className="settings-range-label">
              日付サイズ: {settings.dateSize}
              <input type="range" min="8" max="24" value={settings.dateSize} onChange={(e) => applyChange({ ...settings, dateSize: Number(e.target.value) })} className="settings-range" />
            </label>
            <label className="settings-range-label">
              日付の太さ: {settings.dateFontWeight}
              <input type="range" min="100" max="900" step="100" value={settings.dateFontWeight} onChange={(e) => applyChange({ ...settings, dateFontWeight: Number(e.target.value) })} className="settings-range" />
            </label>
            <label className="settings-range-label">
              日付の文字間隔: {settings.dateLetterSpacing}
              <input type="range" min="0" max="20" value={settings.dateLetterSpacing} onChange={(e) => applyChange({ ...settings, dateLetterSpacing: Number(e.target.value) })} className="settings-range" />
            </label>
            <div className="settings-date-position">
              <span style={{ fontSize: "13px" }}>日付の位置</span>
              <div className="settings-position-grid">
                {(["top-left", "top", "top-right", "left", "", "right", "bottom-left", "bottom", "bottom-right"] as const).map((pos, i) => {
                  if (pos === "") return <div key={i} />;
                  const isDigital = settings.clockStyle === "digital";
                  const disabled = isDigital && pos !== "left" && pos !== "right" && pos !== "top" && pos !== "bottom";
                  return (
                    <button
                      key={pos}
                      type="button"
                      className={`settings-position-btn ${settings.datePosition === pos ? "selected" : ""}`}
                      disabled={disabled}
                      onClick={() => applyChange({ ...settings, datePosition: pos as DatePosition })}
                    >●</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "外観" && (
          <>
            <div className="settings-checkbox-group">
              <label className="settings-checkbox-label">
                <input type="checkbox" checked={settings.showBorder} onChange={() => handleToggle("showBorder")} />
                枠線を表示
              </label>
              <label className="settings-checkbox-label">
                <input type="checkbox" checked={settings.alwaysOnTop} onChange={() => handleToggle("alwaysOnTop")} />
                常に最前面
              </label>
            </div>

            <label className="settings-range-label">
              背景の不透明度: {settings.bgOpacity}%
              <input type="range" min="0" max="100" value={settings.bgOpacity} onChange={(e) => applyChange({ ...settings, bgOpacity: Number(e.target.value) })} className="settings-range" />
            </label>
            <label className="settings-range-label">
              全体の不透明度: {settings.clockOpacity}%
              <input type="range" min="10" max="100" value={settings.clockOpacity} onChange={(e) => applyChange({ ...settings, clockOpacity: Number(e.target.value) })} className="settings-range" />
            </label>

            <fieldset className="settings-fieldset">
              <legend className="settings-legend">背景色</legend>
              <div className="settings-color-options">
                {[
                  { label: "ダーク", value: "#181820" },
                  { label: "ライト", value: "#ffffff" },
                  { label: "ブルー", value: "#142850" },
                  { label: "透明", value: "transparent" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`settings-color-swatch ${settings.bgColor === opt.value ? "selected" : ""}`}
                    onClick={() => applyChange({ ...settings, bgColor: opt.value })}
                  >
                    <span className="settings-color-preview" style={{ background: opt.value === "transparent" ? "repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%) 50%/12px 12px" : opt.value }} />
                    <span className="settings-style-label">{opt.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
      </div>
    </main>
  );
}
