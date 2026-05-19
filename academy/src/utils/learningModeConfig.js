/**
 * Learning mode metadata for canvas components.
 * This file is now a thin adapter over awsComponentLibrary — it maps
 * canvas component ids to the single source-of-truth in the library.
 *
 * The returned object matches the shape expected by LearningModeTooltip:
 *   { label, description, whenToUse (string), commonMistakes (string[]) }
 */

import { getComponentInfo as getLibraryInfo } from "./awsComponentLibrary";

export function getComponentInfo(componentType) {
  const entry = getLibraryInfo(componentType);
  if (!entry) return null;

  return {
    label: entry.name,
    description: entry.description,
    // whenToUse is an array in the library; join for tooltip display
    whenToUse: entry.whenToUse.join(" "),
    commonMistakes: entry.commonMistakes,
  };
}

// Legacy named export for any code that imports LEARNING_MODE_CONFIG directly
export const LEARNING_MODE_CONFIG = new Proxy({}, {
  get(_, componentType) {
    return getComponentInfo(componentType);
  },
});
