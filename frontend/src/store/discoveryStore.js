/**
 * discoveryStore.js
 *
 * Holds the latest discovery report loaded from an archon-cli
 * `discover --format archon` JSON file.
 *
 * Shape of report:
 * {
 *   archonCliVersion: string,
 *   reportType: "discover",
 *   region: string,
 *   nodes: Array<{
 *     id: string,
 *     type: string,          // canvas_type (e.g. "ec2", "rds")
 *     data: {
 *       label: string,
 *       config: object,
 *       service: string,     // e.g. "EC2", "RDS", "Lambda"
 *       awsType: string,     // e.g. "Instance", "DBInstance"
 *       discoveredState: string,
 *     }
 *   }>,
 *   summary: Record<string, number>,  // canvas_type -> count
 *   edges: Array<{
 *     id: string,
 *     source: string,
 *     target: string,
 *     type: string,
 *   }>,
 *   errors: Array<{ service: string, error: string }>,
 * }
 */

import { create } from "zustand";

const useDiscoveryStore = create((set) => ({
  report: null,

  setReport: (report) => set({ report }),

  clearReport: () => set({ report: null }),
}));

export default useDiscoveryStore;
