import { create } from "zustand";
import { fetchAccessStatus } from "../api/access";

const DEFAULT_FEATURES = {
  validation_engine: false,
  finops_live: false,
  terraform_import: false,
  terraform_plan: false,
  discovery: false,
  live_pricing: false,
  gitops: false,
  unlimited_iac: false,
  canvas: true,
  basic_iac: true,
  static_pricing: true,
  cloud_save: false,
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
