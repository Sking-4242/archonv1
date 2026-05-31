import { create } from "zustand";
import { fetchAccessStatus } from "../api/access";

const DEFAULT_FEATURES = {
  academy_cp_modules: true,
  academy_one_practice_test: true,
  academy_all_certs: false,
  academy_ai_tutor: false,
  academy_all_practice_tests: false,
  instructor_dashboard: false,
  lti: false,
};

const useAccessStore = create((set, get) => ({
  tier: "free",
  hasFullAccess: false,
  openAccess: false,
  showRenewalWarning: false,
  renewalMessage: null,
  license: null,
  features: { ...DEFAULT_FEATURES },
  loaded: false,

  refresh: async () => {
    try {
      const data = await fetchAccessStatus();
      set({
        tier: data.tier,
        hasFullAccess: data.has_full_access,
        openAccess: !!data.open_access,
        showRenewalWarning: data.show_renewal_warning,
        renewalMessage: data.renewal_message,
        license: data.license,
        features: { ...DEFAULT_FEATURES, ...data.features },
        loaded: true,
      });
      return data;
    } catch {
      set({ loaded: true });
      return null;
    }
  },

  canUse: (feature) => {
    const { features, hasFullAccess } = get();
    if (hasFullAccess) return true;
    return !!features[feature];
  },
}));

export default useAccessStore;
