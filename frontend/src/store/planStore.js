import { create } from "zustand";

/**
 * Stores the current Terraform plan summary when a plan has been imported.
 * planSummary === null means no plan is loaded (normal validation mode).
 *
 * summary shape:
 *   {
 *     counts: { create: n, update: n, delete: n, replace: n, "no-op": n },
 *     changes: [{ action, address, display_name, description }],
 *     prior_summary: [{ tf_type, display, count }],
 *     region: string,
 *   }
 */
const usePlanStore = create((set) => ({
  planSummary: null,

  setPlanSummary: (summary) => set({ planSummary: summary }),

  clearPlan: () => set({ planSummary: null }),
}));

export default usePlanStore;
