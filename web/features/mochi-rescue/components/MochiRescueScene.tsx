"use client";

import Image from "next/image";
import { useMemo, useRef } from "react";
import { useMochiSceneAnimation } from "../animations/useMochiSceneAnimation";
import { getMochiAsset } from "../config/mochiAssets";
import { useMochiEffectsStore } from "../store/useMochiEffectsStore";
import type { MochiStage } from "../types";
import styles from "./MochiRescue.module.css";

const STAGE_LABELS: Record<MochiStage, string> = {
  trapped: "Tangled but ready",
  struggling: "Finding a loose thread",
  "almost-free": "Almost free",
  rescued: "Mochi rescued",
};

export function MochiRescueScene({
  stage,
}: {
  stage: MochiStage;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const activeEffect = useMochiEffectsStore((state) => state.activeEffect);
  const asset = getMochiAsset(stage, activeEffect?.type);
  const subtitle = useMemo(() => {
    if (activeEffect?.type === "ROLLBACK") {
      return "Mochi rewinds the thread.";
    }

    if (activeEffect?.type === "TASK_COMPLETED") {
      return "One knot loosened.";
    }

    if (activeEffect?.type === "TASK_UNCOMPLETED") {
      return "A thread slipped back.";
    }

    return `${STAGE_LABELS[stage]}`;
  }, [activeEffect?.type, stage]);

  useMochiSceneAnimation({
    activeEffect,
    imageRef,
    rootRef,
  });

  return (
    <div className={styles.mochiCard} ref={rootRef}>
      <button className={styles.cardMenu} aria-label="Quest menu">
        <span className="material-symbols-outlined" aria-hidden="true">
          more_horiz
        </span>
      </button>

      <div className={styles.illustrationRing}>
        <Image
          ref={imageRef}
          src={asset}
          alt="Mochi the cat in the rescue scene"
          width={180}
          height={180}
          className={styles.mochiImage}
          priority
        />
      </div>

      <h2 className={styles.mochiTitle}>Help Mochi escape</h2>
      <p className={styles.mochiSubtitle}>{subtitle}</p>
    </div>
  );
}
