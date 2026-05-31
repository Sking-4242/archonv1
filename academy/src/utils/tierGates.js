export const UPGRADE_URL = import.meta.env.VITE_ARCHONPRO_URL ?? "http://localhost:3002";

export const FREE_CP_CERT = "aws_ccp";

export function featureLabel(feature) {
  const labels = {
    academy_all_certs: "All certification tracks",
    academy_ai_tutor: "AI tutor",
    academy_teaching_assistant: "Teaching assistant",
    academy_all_practice_tests: "Full practice tests",
    instructor_dashboard: "Instructor dashboard",
    lti: "LTI integration",
  };
  return labels[feature] ?? feature;
}

/** Modules tagged for AWS Cloud Practitioner are free-tier content. */
export function isFreeTierModule(module) {
  if (!module) return false;
  if (module.course && module.course !== "aws") return false;
  const tags = module.certification_tags || [];
  return tags.includes(FREE_CP_CERT);
}

export function canAccessModule(module, canUse) {
  if (!module) return false;
  if (canUse("academy_all_certs")) return true;
  return isFreeTierModule(module);
}

export function canAccessCourseProvider(provider, canUse) {
  if (canUse("academy_all_certs")) return true;
  return provider === "aws";
}

/** Free tier: AWS CP practice test 1 only. Paid: all tests for supported certs. */
export function canAccessPracticeTest(cert, testNumber, canUse) {
  if (canUse("academy_all_practice_tests")) return true;
  if (canUse("academy_one_practice_test") && cert === "aws-cp" && testNumber === 1) {
    return true;
  }
  return false;
}

export function difficultyLabel(difficulty) {
  const labels = {
    below: "Below exam level",
    at: "Exam level",
    above: "Above exam level",
  };
  return labels[difficulty] ?? difficulty;
}

export function modeLabel(mode) {
  return mode === "live" ? "Live (timed)" : "Study (unlimited)";
}
