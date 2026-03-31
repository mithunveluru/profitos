import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) => {
  localStorage.setItem("access_token", accessToken);   // ← add this
  set({ user, accessToken, refreshToken, isAuthenticated: true });
},

      logout: () => {
  localStorage.removeItem("access_token");             // ← add this
  set({ user: null, accessToken: null, isAuthenticated: false });
},

      isAuthenticated: () => !!get().accessToken,

      // Role helpers
      isOwner:    () => get().user?.role === "owner",
      isManager:  () => ["owner", "manager"].includes(get().user?.role),
      isAccounts: () => ["owner", "manager", "accounts"].includes(get().user?.role),
      hasRole:    (roles) => roles.includes(get().user?.role),
    }),
    {
      name: "profitos-auth",
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// Convenience hook
export function useRole() {
  const { user, isOwner, isManager, isAccounts, hasRole } = useAuthStore();
  return { role: user?.role, isOwner: isOwner(), isManager: isManager(), isAccounts: isAccounts(), hasRole };
}