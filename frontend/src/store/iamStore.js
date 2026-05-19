import { create } from "zustand";

const useIAMStore = create((set) => ({
  iamRoles: [],

  setIAMRoles: (roles) => set({ iamRoles: roles }),

  addIAMRole: (role) =>
    set((state) => ({ iamRoles: [...state.iamRoles, role] })),

  updateIAMRole: (id, updates) =>
    set((state) => ({
      iamRoles: state.iamRoles.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    })),

  removeIAMRole: (id) =>
    set((state) => ({
      iamRoles: state.iamRoles.filter((r) => r.id !== id),
    })),
}));

export default useIAMStore;
