"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, hydrate, setUser } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const savedToken = useAuthStore.getState().token;
    if (savedToken && !useAuthStore.getState().user) {
      api.auth.me().then((user) => {
        useAuthStore.getState().setUser(user);
      }).catch(() => {
        useAuthStore.getState().logout();
      });
    }
  }, []);

  return <>{children}</>;
}

export { AuthProvider };