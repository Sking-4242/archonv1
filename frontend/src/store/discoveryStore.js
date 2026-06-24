/**
 * discoveryStore.js
 *
 * Holds the latest discovery report and wizard preferences (last-used
 * profile/region so the wizard pre-fills on subsequent opens).
 *
 * Report shape:
 * {
 *   archonCliVersion: string,
 *   reportType: "discover",
 *   region: string,
 *   nodes: Array<{ id, type, data: { label, config, service, awsType, discoveredState } }>,
 *   summary: Record<string, number>,
 *   edges: Array<{ id, source, target, type }>,
 *   errors: Array<{ service, error }>,
 * }
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

const useDiscoveryStore = create(
  persist(
    (set) => ({
      report: null,
      lastProfile: null,   // null = default credential chain
      lastRegion: "us-east-1",

      setReport: (report) => set({ report }),
      clearReport: () => set({ report: null }),
      setLastProfile: (lastProfile) => set({ lastProfile }),
      setLastRegion: (lastRegion) => set({ lastRegion }),
    }),
    {
      name: "archon-discovery",
      partialize: (state) => ({
        lastProfile: state.lastProfile,
        lastRegion: state.lastRegion,
        // Don't persist the report — it can be large and goes stale
      }),
    }
  )
);

export default useDiscoveryStore;
