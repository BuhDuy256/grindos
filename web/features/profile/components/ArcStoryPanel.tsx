"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { EcrEntry } from "@/features/stats/types";
import styles from "./ProfileStatsScreen.module.css";

function formatStoryDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return text
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={index}>{part.slice(1, -1)}</code>;
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }

      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }

      return part;
    });
}

function MarkdownBlock({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className={styles.storyMarkdown}>
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const firstLine = lines[0] ?? "";
        const heading = firstLine.match(/^(#{1,3})\s+(.+)$/);

        if (heading) {
          return (
            <h3 key={index}>
              {renderInlineMarkdown(heading[2])}
            </h3>
          );
        }

        const listItems = lines
          .map((line) => line.match(/^[-*]\s+(.+)$/) ?? line.match(/^\d+\.\s+(.+)$/))
          .filter((item): item is RegExpMatchArray => Boolean(item));

        if (listItems.length === lines.length) {
          return (
            <ul key={index}>
              {listItems.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(item[1])}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index}>
            {renderInlineMarkdown(lines.join(" "))}
          </p>
        );
      })}
    </div>
  );
}

function getStoryMarkdown(entry: EcrEntry) {
  return [entry.learning_summary, entry.ai_insight]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function ArcStoryPanel({ history }: { history: EcrEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const entries = useMemo(
    () =>
      [...history]
        .map((entry) => ({ ...entry, story: getStoryMarkdown(entry) }))
        .filter((entry) => entry.story.length > 0)
        .reverse(),
    [history],
  );
  const visibleEntries = expanded ? entries : entries.slice(0, 3);

  return (
    <section className={`${styles.storyPanel} ${expanded ? styles.storyPanelExpanded : ""}`}>
      <div className={styles.storyHeader}>
        <div>
          <h2 className={styles.storyTitle}>Arc Story</h2>
          <p className={styles.storySubtitle}>
            {entries.length > 0 ? `${entries.length} recovered logs` : "No logs recovered yet"}
          </p>
        </div>
        <button
          className={styles.storyToggle}
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {expanded ? "unfold_less" : "unfold_more"}
          </span>
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      <div className={styles.storyScroll}>
        {visibleEntries.length > 0 ? (
          visibleEntries.map((entry) => (
            <article key={entry.date} className={styles.storyEntry}>
              <div className={styles.storyEntryHeader}>
                <span>{formatStoryDate(entry.date)}</span>
                <strong>{entry.ecr_score}% ECR</strong>
              </div>
              <MarkdownBlock markdown={entry.story} />
            </article>
          ))
        ) : (
          <p className={styles.storyEmpty}>
            Arc logs will appear here after end-of-day learning summaries are recorded.
          </p>
        )}
      </div>
    </section>
  );
}
