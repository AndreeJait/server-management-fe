import { create } from "zustand";
import type { UserResponse } from "@/types";
import { ROLE_PERMISSIONS } from "@/types";

type AuthState = {
  token: string | null;
  user: UserResponse | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setAuth: (token: string, user: UserResponse) => void;
  setUser: (user: UserResponse) => void;
  logout: () => void;
  hydrate: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  hydrated: false,

  hydrate: () => {
    const token = localStorage.getItem("token");
    set({
      token,
      isAuthenticated: !!token,
      hydrated: true,
    });
  },

  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    set({ token, user, isAuthenticated: true, hydrated: true });
  },

  setUser: (user) => {
    set({ user });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null, isAuthenticated: false, hydrated: true });
  },

  hasPermission: (permission: string) => {
    const user = get().user;
    if (!user) return false;
    for (const role of user.roles) {
      const perms: string[] | undefined = ROLE_PERMISSIONS[role];
      if (perms && perms.includes(permission)) return true;
    }
    return false;
  },

  hasRole: (role: string) => {
    const user = get().user;
    if (!user) return false;
    return user.roles.includes(role);
  },
}));