"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface User {
  id: number;
  username: string;
  timezone: string;
}

export function UserSwitcher({
  userId,
  onSwitch,
}: {
  userId: number;
  onSwitch: (id: number) => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiClient.get<User[]>("/admin/users").then((res) => {
      if (!res.error) setUsers(res.data);
    });
  }, []);

  const active = users.find((u) => u.id === userId);

  if (users.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1"
      >
        <span className="text-violet-500">●</span>
        <span>{active ? active.username : `User ${userId}`}</span>
        <span className="text-xs text-zinc-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => { onSwitch(u.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 ${
                u.id === userId ? "text-violet-600 font-medium" : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span className={u.id === userId ? "text-violet-500" : "text-zinc-300"}>●</span>
              <span>{u.username}</span>
              <span className="text-xs text-zinc-400 ml-auto">#{u.id}</span>
            </button>
          ))}
          <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1">
            <a
              href="/onboarding"
              className="block px-3 py-2 text-sm text-zinc-500 hover:text-violet-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              + Onboard new user
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
