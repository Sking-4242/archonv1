import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: "archon-portal-auth", partialize: (s) => ({ user: s.user, token: s.token }) },
  ),
);

export default useAuthStore;
