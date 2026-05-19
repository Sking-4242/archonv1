import { create } from "zustand";

export const useAssignmentStore = create((set) => ({
  // Current assignment the student is working on
  activeAssignment: null,

  // Submission state for the active assignment
  submission: null,

  // Learning mode toggle
  learningMode: true,

  // Assignment list cache (student or instructor view)
  assignments: [],

  setActiveAssignment: (assignment) => set({ activeAssignment: assignment, submission: null }),

  setSubmission: (submission) => set({ submission }),

  setAssignments: (assignments) => set({ assignments }),

  toggleLearningMode: () => set((state) => ({ learningMode: !state.learningMode })),

  clearActive: () => set({ activeAssignment: null, submission: null }),
}));
