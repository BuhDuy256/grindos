"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/features/shell/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { clearAuth } from "@/lib/auth";
import { useStatsData } from "@/features/stats/hooks/useStatsData";
import { ArcStoryPanel } from "./ArcStoryPanel";
import { CalendarHeatmap } from "./CalendarHeatmap";
import { SettingsPopup } from "./SettingsPopup";
import styles from "./ProfileStatsScreen.module.css";

const TITLES: [number, string][] = [
  [1, "Apprentice Rescuer"],
  [5, "Junior Rescuer"],
  [10, "Skilled Rescuer"],
  [20, "Expert Rescuer"],
  [50, "Master Rescuer"],
  [100, "Legendary Rescuer"],
];

function getPlayerTitle(level: number): string {
  let title = TITLES[0][1];
  for (const [minLevel, nextTitle] of TITLES) {
    if (level >= minLevel) title = nextTitle;
  }
  return title;
}

function getMaxXp(level: number): number {
  return level * 1000;
}

interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
}

const BADGES: Badge[] = [
  { id: "first-rescue", label: "First Rescue", icon: "verified", earned: true },
  { id: "item-collector", label: "Item Collector", icon: "pets", earned: true },
  { id: "master-miner", label: "Master Miner", icon: "emoji_events", earned: true },
  { id: "early-bird", label: "Early Bird", icon: "lock", earned: false },
];

export function ProfileStatsScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { stats, history, loading: statsLoading } = useStatsData();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  const loading = authLoading || statsLoading;

  if (loading) {
    return (
      <AppShell hideSidebarOnMobile>
        <div className={styles.loading}>Loading...</div>
      </AppShell>
    );
  }

  const level = stats?.level ?? 1;
  const exp = stats?.exp ?? 0;
  const maxXp = getMaxXp(level);
  const xpPercent = Math.min(100, Math.round((exp / maxXp) * 100));
  const playerTitle = getPlayerTitle(level);

  return (
    <AppShell hideSidebarOnMobile>
      <div className={styles.contentWrapper}>
        <div className={styles.desktopLayout}>
          <section className={`${styles.avatarSection} ${styles.profileCard}`}>
            <div className={styles.avatarRing}>
              <Image
                src="/assets/mochi.png"
                alt="Player avatar"
                width={72}
                height={72}
                className={styles.avatarImage}
                priority
              />
              <span className={styles.levelBadge}>LV{level}</span>
            </div>

            <div className={styles.profileIdentity}>
              <h1 className={styles.playerName}>{user?.username || "Player"}</h1>
              <p className={styles.playerTitle}>{playerTitle}</p>
            </div>

            <button className={styles.editBtn} onClick={openSettings} aria-label="Open settings">
              <span className="material-symbols-outlined" aria-hidden="true">
                edit
              </span>
            </button>
          </section>

          <div className={`${styles.miniCard} ${styles.streakCard}`}>
            <span className={`material-symbols-outlined ${styles.miniCardIcon}`} aria-hidden="true">
              local_fire_department
            </span>
            <p className={styles.miniCardLabel}>Streak</p>
            <p className={styles.miniCardValue}>{stats?.streak ?? 0}d</p>
          </div>

          <div className={`${styles.miniCard} ${styles.multCard}`}>
            <span className={`material-symbols-outlined ${styles.miniCardIcon}`} aria-hidden="true">
              bolt
            </span>
            <p className={styles.miniCardLabel}>Mult.</p>
            <p className={styles.miniCardValue}>
              x{(stats?.difficulty_multiplier ?? 1).toFixed(2)}
            </p>
          </div>

          <div className={`${styles.panel} ${styles.xpPanel}`}>
            <div className={styles.xpHeader}>
              <p className={styles.xpLabel}>
                <Image
                  src="/assets/pawn.svg"
                  alt=""
                  aria-hidden="true"
                  className={styles.starIcon}
                  width={16}
                  height={16}
                />
                Experience
              </p>
              <p className={styles.xpCount}>
                {exp} / {maxXp} XP
              </p>
            </div>
            <div className={styles.xpTrack}>
              <div
                className={styles.xpFill}
                style={{ width: `${xpPercent}%` }}
                role="progressbar"
                aria-valuenow={exp}
                aria-valuemin={0}
                aria-valuemax={maxXp}
              />
            </div>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statCell}>
              <span className={`material-symbols-outlined ${styles.statIcon}`} aria-hidden="true">
                fitness_center
              </span>
              <span className={styles.statLabel}>STR</span>
              <span className={styles.statValue}>{stats?.str_stat ?? 0}</span>
            </div>
            <div className={styles.statCell}>
              <span className={`material-symbols-outlined ${styles.statIcon}`} aria-hidden="true">
                psychology
              </span>
              <span className={styles.statLabel}>INT</span>
              <span className={styles.statValue}>{stats?.int_stat ?? 0}</span>
            </div>
            <div className={styles.statCell}>
              <span className={`material-symbols-outlined ${styles.statIcon}`} aria-hidden="true">
                favorite
              </span>
              <span className={styles.statLabel}>VIT</span>
              <span className={styles.statValue}>{stats?.vit_stat ?? 0}</span>
            </div>
          </div>

          <div className={styles.heatmapPanel}>
            <div className={styles.heatmapHeader}>
              <h2 className={styles.heatmapTitle}>Streak Activity</h2>
              <span className={styles.heatmapSubtitle}>Last 365 days</span>
            </div>
            <CalendarHeatmap history={history} days={365} />
          </div>

          <ArcStoryPanel history={history} />

          <section className={styles.badgeSection}>
            <h2 className={styles.badgeSectionTitle}>Badges</h2>
            <div className={styles.badgeGrid}>
              {BADGES.map((badge) => (
                <div key={badge.id} className={styles.badge}>
                  <div
                    className={`${styles.badgeIcon} ${
                      !badge.earned ? styles.badgeLocked : ""
                    }`}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {badge.icon}
                    </span>
                  </div>
                  <p
                    className={`${styles.badgeLabel} ${
                      badge.earned ? styles.badgeLabelEarned : ""
                    }`}
                  >
                    {badge.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className={styles.bottomRow}>
            {user?.is_admin ? (
              <Link className={styles.adminLink} href="/admin">
                <span className={`material-symbols-outlined ${styles.adminIcon}`} aria-hidden="true">
                  settings
                </span>
                Admin panel
              </Link>
            ) : null}

            <div className={styles.signOutPanel}>
              <button className={styles.signOutBtn} onClick={logout}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  logout
                </span>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <SettingsPopup open={settingsOpen} onClose={closeSettings} />
    </AppShell>
  );
}
