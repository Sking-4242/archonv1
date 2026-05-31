import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      activeSaveId: null,

      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null, activeSaveId: null }),
      setActiveSaveId: (activeSaveId) => set({ activeSaveId }),
    }),
    {
      name: "archon-pro-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        activeSaveId: state.activeSaveId,
      }),
    },
  ),
);

export default useAuthStore;
