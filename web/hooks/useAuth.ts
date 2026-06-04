"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { clearAuth, getToken, getUser, setAuth, type AuthUser } from "@/lib/auth";

interface AuthMeResponse {
  token: string;
  user_id: string;
  username: string;
  is_admin: boolean;
  is_onboarded: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function syncSession() {
      const cachedUser = getUser();
      if (cachedUser) {
        if (active) {
          setUser(cachedUser);
          setLoading(false);
        }
        return;
      }

      if (!getToken()) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      const res = await apiClient.get<AuthMeResponse>("/auth/me");
      if (!active) {
        return;
      }

      if (res.error || !res.data) {
        clearAuth();
      } else {
        const nextUser = {
          id: res.data.user_id,
          username: res.data.username,
          is_admin: res.data.is_admin,
        };
        setAuth(res.data.token, nextUser, { isOnboarded: res.data.is_onboarded });
        setUser(nextUser);
      }
      setLoading(false);
    }

    void syncSession();

    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}
