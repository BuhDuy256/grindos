import { ReactNode } from "react";
import { MochiEffectsProvider } from "@/features/mochi-rescue/providers/MochiEffectsProvider";
import { ShellSidebar } from "./ShellSidebar";
import styles from "./AppShell.module.css";

export interface ShellDailyPlanContext {
  userId: string;
  date: string;
}

export function AppShell({
  children,
  dailyPlanContext,
  hideSidebarOnMobile,
}: {
  children: ReactNode;
  dailyPlanContext?: ShellDailyPlanContext;
  hideSidebarOnMobile?: boolean;
}) {
  const mochiResetKey = dailyPlanContext
    ? `${dailyPlanContext.userId}:${dailyPlanContext.date}`
    : "sidebar-static";

  return (
    <MochiEffectsProvider resetKey={mochiResetKey}>
      <div className={styles.layout}>
        <header className={styles.mobileTopBar}>
          <div className={styles.mobileTopBarLeft}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "24px", color: "var(--color-primary)" }}
            >
              pets
            </span>
            <span className={styles.mobileTopBarTitle}>Mochi Rescue</span>
          </div>
          <span className={styles.mobileTopBarStreak}>
            5{" "}
            <span className="material-symbols-outlined" aria-hidden="true">
              local_fire_department
            </span>
          </span>
        </header>

        <main
          className={`${styles.appContainer} ${
            hideSidebarOnMobile ? styles.appContainerHideMobileNav : ""
          }`}
        >
          <div className={hideSidebarOnMobile ? styles.sidebarHideMobile : undefined}>
            <ShellSidebar dailyPlanContext={dailyPlanContext} />
          </div>
          <section className={styles.main}>
            <div className={styles.content}>{children}</div>
          </section>
        </main>
      </div>
    </MochiEffectsProvider>
  );
}
