"use client";

import { animate, createScope, type Scope } from "animejs";
import { useEffect, useRef } from "react";
import type { MochiEffectEvent } from "../types";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export function useMochiProgressAnimation({
  activeEffect,
  fillRef,
  progress,
  rootRef,
}: {
  activeEffect: MochiEffectEvent | null;
  fillRef: React.RefObject<HTMLElement | null>;
  progress: number;
  rootRef: React.RefObject<HTMLElement | null>;
}) {
  const scopeRef = useRef<Scope | null>(null);
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
    const fill = fillRef.current;
    if (!fill) return;

    const targetScale = Math.max(0, Math.min(100, progress)) / 100;
    if (activeEffect) {
      const fromScale = Math.max(0, Math.min(100, activeEffect.fromProgress)) / 100;
      const toScale = Math.max(0, Math.min(100, activeEffect.toProgress)) / 100;
      fill.style.transformOrigin = "left center";

      if (reducedMotion) {
        fill.style.transform = `scaleX(${toScale})`;
        return;
      }

      scopeRef.current?.execute(() => {
        animate(fill, {
          scaleX: [fromScale, toScale],
          duration: 520,
          ease: "outCubic",
        });
      });
      return;
    }

    fill.style.transformOrigin = "left center";
    if (reducedMotion) {
      fill.style.transform = `scaleX(${targetScale})`;
      return;
    }

    scopeRef.current?.execute(() => {
      animate(fill, {
        scaleX: targetScale,
        duration: 280,
        ease: "outCubic",
      });
    });
  }, [activeEffect, fillRef, progress, reducedMotion]);
}
