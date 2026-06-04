"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, type AuthUser } from "@/lib/auth";

export function useAuth({ required = true }: { required?: boolean } = {}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    const t = getToken();
    if (!u || !t) {
      if (required) router.replace("/login");
    } else {
      setUser(u);
    }
    setLoading(false);
  }, [required, router]);

  return { user, loading };
}
