import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,   // { id, name, email, role: "student" | "instructor" }
      token: null,

      login: (user, token) => set({ user, token }),

      logout: () => set({ user: null, token: null }),

      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
    }),
    {
      name: "archon-academy-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

// named export kept for backward compatibility
export { useAuthStore };
export default useAuthStore;
