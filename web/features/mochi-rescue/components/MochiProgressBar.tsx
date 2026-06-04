"use client";

import { useRef } from "react";
import { useMochiProgressAnimation } from "../animations/useMochiProgressAnimation";
import { useMochiEffectsStore } from "../store/useMochiEffectsStore";
import styles from "./MochiRescue.module.css";

export function MochiProgressBar({
  progress,
}: {
  progress: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const activeEffect = useMochiEffectsStore((state) => state.activeEffect);
  const boundedProgress = Math.max(0, Math.min(100, progress));

  useMochiProgressAnimation({
    activeEffect,
    fillRef,
    progress: boundedProgress,
    rootRef,
  });

  return (
    <div className={styles.progressBlock} ref={rootRef}>
      <div className={styles.progressHeader}>
        <span>Daily progress</span>
        <strong>{boundedProgress}%</strong>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuenow={boundedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Daily rescue progress"
      >
        <div
          ref={fillRef}
          className={styles.progressFill}
          style={{ transform: `scaleX(${boundedProgress / 100})` }}
        />
      </div>
    </div>
  );
}
