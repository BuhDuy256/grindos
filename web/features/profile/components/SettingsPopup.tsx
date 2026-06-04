"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  ACCENT_PRESETS,
  FONT_SIZES,
  useProfileSettings,
} from "../hooks/useProfileSettings";
import styles from "./SettingsPopup.module.css";

interface SettingsPopupProps {
  open: boolean;
  onClose: () => void;
}

/**
 * SettingsPopup — Slide-in popup panel for theme, font size, and accent color.
 *
 * Triggered by the edit button on the profile screen.
 * Animates in from the right with a backdrop overlay.
 */
export function SettingsPopup({ open, onClose }: SettingsPopupProps) {
  const { isDark, fontSize, accent, setTheme, setFontSizeChoice, setAccentColor } =
    useProfileSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Close on click outside panel
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div ref={panelRef} className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {/* Theme toggle */}
        <div className={styles.setting}>
          <h3 className={styles.settingTitle}>Theme</h3>
          <div className={styles.segmented}>
            <button
              className={`${styles.choice} ${!isDark ? styles.choiceActive : ""}`}
              onClick={() => setTheme("light")}
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>
                light_mode
              </span>
              Light
            </button>
            <button
              className={`${styles.choice} ${isDark ? styles.choiceActive : ""}`}
              onClick={() => setTheme("dark")}
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>
                dark_mode
              </span>
              Dark
            </button>
          </div>
        </div>

        {/* Font size */}
        <div className={styles.setting}>
          <h3 className={styles.settingTitle}>Font size</h3>
          <div className={styles.segmented}>
            {FONT_SIZES.map(({ label, key, px }) => (
              <button
                key={key}
                className={`${styles.choice} ${fontSize === key ? styles.choiceActive : ""}`}
                onClick={() => setFontSizeChoice(key, px)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className={styles.setting}>
          <h3 className={styles.settingTitle}>Accent color</h3>
          <div className={styles.swatches}>
            {ACCENT_PRESETS.map(({ label, value }) => (
              <button
                key={value}
                className={`${styles.swatch} ${accent === value ? styles.swatchActive : ""}`}
                style={{ background: value }}
                onClick={() => setAccentColor(value)}
                aria-label={label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
