"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { EcrEntry } from "@/features/stats/types";

interface CalendarHeatmapProps {
  history: EcrEntry[];
  days?: number;
}

/**
 * CalendarHeatmap — D3.js calendar chart showing streak activity.
 *
 * Uses CSS custom properties for colors so it stays in sync with
 * the global design tokens and accent color.
 */
export function CalendarHeatmap({ history, days = 28 }: CalendarHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous render
    container.innerHTML = "";

    const computedStyle = getComputedStyle(document.documentElement);
    function cssVar(name: string, fallback: string): string {
      return computedStyle.getPropertyValue(name).trim() || fallback;
    }

    // ─── Data prep ──────────────────────────────────────
    const today = d3.timeDay.floor(new Date());
    const startDate = d3.timeDay.offset(today, -(days - 1));

    // Map ecr data by date string for fast lookup
    const ecrMap = new Map<string, number>();
    for (const entry of history) {
      ecrMap.set(entry.date, entry.ecr_score);
    }

    // ─── Layout calculations ────────────────────────────
    const margin = { top: 18, right: 6, bottom: 4, left: 24 };
    const containerWidth = container.clientWidth || 320;
    const gap = 2;

    const start = d3.timeSunday.floor(startDate);
    const end = d3.timeSunday.ceil(d3.timeDay.offset(today, 1));
    const weekCount = d3.timeSunday.count(start, end);

    const innerWidth = containerWidth - margin.left - margin.right;
    // Cap cell size at 16px for compact display
    const cellWidth = Math.min(16, Math.max(8, Math.floor(innerWidth / Math.max(weekCount, 1))));
    const cellHeight = cellWidth; // Keep square
    const cellRadius = Math.max(1, cellWidth * 0.18);
    const labelFontSize = Math.min(Math.max(cellWidth * 0.6, 8), 10);

    const calendarWidth = weekCount * cellWidth;
    const calendarHeight = 7 * cellHeight;
    const totalHeight = margin.top + calendarHeight + margin.bottom;

    // ─── Color scale ────────────────────────────────────
    const heatmapColors = [
      cssVar("--color-heatmap-empty", "#ebe7e7"),
      cssVar("--color-heatmap-l1", "#f3ecd4"),
      cssVar("--color-heatmap-l2", "#f0e4b8"),
      cssVar("--color-heatmap-l3", "#eddb96"),
      cssVar("--color-heatmap-l4", "#f8d66d"),
    ];

    function getCellColor(date: Date): string {
      const dateStr = d3.timeFormat("%Y-%m-%d")(date);
      const score = ecrMap.get(dateStr);
      if (score === undefined || score <= 0) return heatmapColors[0];
      if (score < 25) return heatmapColors[1];
      if (score < 50) return heatmapColors[2];
      if (score < 75) return heatmapColors[3];
      return heatmapColors[4];
    }

    function getCellOpacity(date: Date): number {
      const dateStr = d3.timeFormat("%Y-%m-%d")(date);
      const score = ecrMap.get(dateStr);
      if (score === undefined || score <= 0) return 0.35;
      return 1;
    }

    // ─── SVG setup ──────────────────────────────────────
    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", totalHeight)
      .attr("viewBox", `0 0 ${containerWidth} ${totalHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("display", "block");

    const offsetX = margin.left + Math.max(0, (innerWidth - calendarWidth) / 2);
    const g = svg.append("g").attr("transform", `translate(${offsetX},${margin.top})`);

    // ─── Day labels ─────────────────────────────────────
    const dayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    g.selectAll("text.day-label")
      .data(dayLabels)
      .join("text")
      .attr("class", "day-label")
      .attr("x", -6)
      .attr("y", (_, i) => i * cellHeight + cellHeight * 0.68)
      .attr("text-anchor", "end")
      .attr("font-size", labelFontSize)
      .attr("fill", cssVar("--color-on-surface-variant", "#444748"))
      .attr("font-family", "inherit")
      .text((d) => d);

    // ─── Calendar cells ─────────────────────────────────
    const allCellDates = d3.timeDay.range(start, end);

    // Tooltip element
    const tooltip = d3
      .select(container)
      .append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("padding", "4px 8px")
      .style("border-radius", "6px")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("background", cssVar("--color-inverse-surface", "#313030"))
      .style("color", cssVar("--color-inverse-on-surface", "#f4f0ef"))
      .style("opacity", "0")
      .style("transition", "opacity 150ms ease")
      .style("white-space", "nowrap")
      .style("z-index", "10");

    g.selectAll("rect.calendar-cell")
      .data(allCellDates)
      .join("rect")
      .attr("class", "calendar-cell")
      .attr("x", (d) => d3.timeSunday.count(start, d) * cellWidth)
      .attr("y", (d) => d.getDay() * cellHeight)
      .attr("width", Math.max(1, cellWidth - gap))
      .attr("height", Math.max(1, cellHeight - gap))
      .attr("rx", cellRadius)
      .attr("fill", (d) => getCellColor(d))
      .attr("stroke", cssVar("--color-surface-container-lowest", "#ffffff"))
      .attr("stroke-width", 0.5)
      .attr("opacity", (d) => getCellOpacity(d))
      .style("cursor", "pointer")
      .on("mouseenter", function (event: MouseEvent, d: Date) {
        const dateStr = d3.timeFormat("%Y-%m-%d")(d);
        const score = ecrMap.get(dateStr);
        const label = d3.timeFormat("%d/%m")(d);
        tooltip
          .html(score !== undefined ? `${label} — ${score}%` : `${label} — no data`)
          .style("opacity", "1")
          .style("left", `${event.offsetX + 8}px`)
          .style("top", `${event.offsetY - 28}px`);
        d3.select(this).attr("stroke-width", 1.5).attr("stroke", cssVar("--color-on-surface", "#1c1b1b"));
      })
      .on("mousemove", function (event: MouseEvent) {
        tooltip.style("left", `${event.offsetX + 8}px`).style("top", `${event.offsetY - 28}px`);
      })
      .on("mouseleave", function () {
        tooltip.style("opacity", "0");
        d3.select(this).attr("stroke-width", 0.5).attr("stroke", cssVar("--color-surface-container-lowest", "#ffffff"));
      });

    // ─── Month labels ───────────────────────────────────
    const monthStarts = d3.timeMonth.range(
      d3.timeMonth.floor(startDate),
      d3.timeMonth.offset(today, 1),
    );

    g.selectAll("text.calendar-month")
      .data(monthStarts)
      .join("text")
      .attr("class", "calendar-month")
      .attr("x", (d) => d3.timeSunday.count(start, d3.timeSunday.floor(d)) * cellWidth)
      .attr("y", -8)
      .attr("font-size", labelFontSize)
      .attr("font-weight", 700)
      .attr("font-family", "inherit")
      .attr("fill", cssVar("--color-on-surface-variant", "#444748"))
      .text(d3.timeFormat("%m/%y"));

    // ─── Cleanup ────────────────────────────────────────
    return () => {
      container.innerHTML = "";
    };
  }, [history, days]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", minHeight: 120 }}
    />
  );
}
