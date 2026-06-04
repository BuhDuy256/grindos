"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchUsers } from "../services/userService";
import type { UserSummary } from "../types";
import styles from "./UserSwitcher.module.css";

export function UserSwitcher({
  userId,
  onSwitch,
}: {
  userId: string;
  onSwitch: (id: string) => void;
}) {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void fetchUsers().then((res) => {
      if (!res.error && res.data) {
        setUsers(res.data);
      }
    });
  }, []);

  const active = users.find((user) => user.id === userId);

  if (users.length === 0) {
    return null;
  }

  return (
    <div className={styles.switcher}>
      <button className={styles.button} onClick={() => setOpen((value) => !value)}>
        <span className={styles.dot} />
        <span>{active ? active.username : `User ${userId}`}</span>
      </button>

      {open ? (
        <div className={styles.menu}>
          {users.map((user) => (
            <button
              key={user.id}
              className={`${styles.option} ${user.id === userId ? styles.optionActive : ""}`}
              onClick={() => {
                onSwitch(user.id);
                setOpen(false);
              }}
            >
              <span className={styles.username}>{user.username}</span>
              <span className={styles.id}>#{user.id}</span>
            </button>
          ))}
          <Link className={styles.link} href="/onboarding">
            Onboard user
          </Link>
        </div>
      ) : null}
    </div>
  );
}
