import { create } from "zustand";

const useSecurityStore = create((set) => ({
  securityGroups: [],

  setSecurityGroups: (sgs) => set({ securityGroups: sgs }),

  addSecurityGroup: (sg) =>
    set((state) => ({ securityGroups: [...state.securityGroups, sg] })),

  updateSecurityGroup: (id, updates) =>
    set((state) => ({
      securityGroups: state.securityGroups.map((sg) =>
        sg.id === id ? { ...sg, ...updates } : sg,
      ),
    })),

  removeSecurityGroup: (id) =>
    set((state) => ({
      securityGroups: state.securityGroups.filter((sg) => sg.id !== id),
    })),
}));

export default useSecurityStore;
