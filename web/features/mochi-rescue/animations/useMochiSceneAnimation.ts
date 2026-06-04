"use client";

import { createScope, createTimeline, type Scope } from "animejs";
import { useEffect, useRef } from "react";
import { useMochiEffectsStore } from "../store/useMochiEffectsStore";
import type { MochiEffectEvent } from "../types";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

function getMotion(effect: MochiEffectEvent) {
  switch (effect.type) {
    case "TASK_COMPLETED":
    case "STAGE_ADVANCED":
    case "ALL_TASKS_COMPLETED":
      return {
        translateY: [0, -10, 0],
        scale: [1, 1.06, 1],
        rotate: [0, -2, 2, 0],
      };
    case "TASK_UNCOMPLETED":
    case "STAGE_REVERSED":
      return {
        translateX: [0, -8, 8, 0],
        scale: [1, 0.98, 1],
        rotate: [0, -3, 3, 0],
      };
    case "ROLLBACK":
      return {
        translateX: [0, 10, -10, 0],
        scale: [1, 0.96, 1],
        rotate: [0, 4, -4, 0],
      };
  }
}

export function useMochiSceneAnimation({
  activeEffect,
  imageRef,
  rootRef,
}: {
  activeEffect: MochiEffectEvent | null;
  imageRef: React.RefObject<HTMLElement | null>;
  rootRef: React.RefObject<HTMLElement | null>;
}) {
  const scopeRef = useRef<Scope | null>(null);
  const completeActiveEffect = useMochiEffectsStore((state) => state.completeActiveEffect);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!rootRef.current) return;
    scopeRef.current = createScope({ root: rootRef });

    return () => {
      scopeRef.current?.revert();
      scopeRef.current = null;
    };
  }, [rootRef]);

  useEffect(() => {
    const image = imageRef.current;
    if (!activeEffect || !image) return;

    if (reducedMotion) {
      const timer = window.setTimeout(() => completeActiveEffect(), 90);
      return () => window.clearTimeout(timer);
    }

    scopeRef.current?.execute(() => {
      const motion = getMotion(activeEffect);
      createTimeline({
        defaults: {
          duration: 520,
          ease: "outCubic",
        },
        onComplete: () => completeActiveEffect(),
      }).add(image, {
        ...motion,
      });
    });
  }, [activeEffect, completeActiveEffect, imageRef, reducedMotion]);
}
