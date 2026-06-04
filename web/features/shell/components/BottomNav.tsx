"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import styles from "./BottomNav.module.css";

const TABS = [
  { href: "/daily-plan", label: "Today", icon: "timer" },
  { href: "/daily-plan", label: "Home", icon: "home", isHome: true },
  { href: "/profile", label: "Profile", icon: "person" },
];

const ADMIN_TAB = { href: "/admin", label: "Admin", icon: "settings" };

/**
 * BottomNav — Mobile-only bottom navigation bar.
 *
 * Styled to match the Stitch Mochi Rescue Dashboard:
 * - 3 main icons (timer, home, stats)
 * - Home icon has a filled, scaled-up active state
 * - Hidden on desktop (sidebar handles navigation)
 */
export function BottomNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const user = getUser();
      setVisible(Boolean(user));
      setIsAdmin(user?.is_admin ?? false);
    });
  }, [pathname]);

  if (
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/")
  ) {
    return null;
  }

  if (!visible) {
    return null;
  }

  const tabs = [...TABS, ...(isAdmin ? [ADMIN_TAB] : [])];

  return (
    <nav className={styles.nav} aria-label="Primary navigation">
      <div className={styles.list}>
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const isHome = 'isHome' in tab && tab.isHome;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`${styles.link} ${active ? styles.linkActive : ""} ${isHome ? styles.linkHome : ""}`}
            >
              <span
                className="material-symbols-outlined"
                style={
                  isHome && active
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {tab.icon}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
