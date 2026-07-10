import { ThemeValidationScores, ValidationThresholds, ValidationDecision } from "./types";

export const DEFAULT_THRESHOLDS: ValidationThresholds = {
  minThemeMatch: 75,
  minQuality: 50,
  minEffort: 40,
  maxSimplicity: 60,
  maxSpam: 30,
};

/**
 * Pure function to apply the threshold rules on model scores.
 * 
 * Strict calibration rules:
 * - High theme-match requirement for approval (>= minThemeMatch)
 * - Minimum quality/effort requirement (>= minQuality, >= minEffort)
 * - Maximum spam score (<= maxSpam)
 * - Maximum simplicity tolerance (<= maxSimplicity)
 * - Ambiguous cases (scores that fall slightly below thresholds, within a 10-point buffer) become NEEDS_REVIEW.
 * - Obvious low-quality / unrelated / high-spam submissions become REJECTED or SPAM.
 */
export function applyThresholds(
  scores: ThemeValidationScores,
  thresholds: ValidationThresholds = DEFAULT_THRESHOLDS
): {
  decision: ValidationDecision;
  rejectionCodes: string[];
  isLowEffort: boolean;
  isOffTheme: boolean;
  isObviousSpam: boolean;
} {
  const rejectionCodes: string[] = [];

  const isOffTheme = scores.themeMatchScore < thresholds.minThemeMatch;
  const isLowEffort = 
    scores.effortScore < thresholds.minEffort || 
    scores.simplicityScore > thresholds.maxSimplicity || 
    scores.qualityScore < thresholds.minQuality;
  const isObviousSpam = scores.spamScore > thresholds.maxSpam;

  if (isOffTheme) rejectionCodes.push("OFF_THEME");
  if (scores.effortScore < thresholds.minEffort) rejectionCodes.push("LOW_EFFORT");
  if (scores.simplicityScore > thresholds.maxSimplicity) rejectionCodes.push("TOO_SIMPLE");
  if (scores.qualityScore < thresholds.minQuality) rejectionCodes.push("LOW_QUALITY");
  if (isObviousSpam) rejectionCodes.push("OBVIOUS_SPAM");

  let decision: ValidationDecision = "APPROVED";

  if (isObviousSpam) {
    decision = "SPAM";
  } else if (scores.themeMatchScore < thresholds.minThemeMatch - 15) {
    // Completely off-theme
    decision = "REJECTED";
  } else if (scores.effortScore < thresholds.minEffort - 15 || scores.qualityScore < thresholds.minQuality - 15) {
    // Extremely low quality or extremely low effort
    decision = "REJECTED";
  } else if (isOffTheme || isLowEffort) {
    // Close failures or borderline checks go to manual admin review
    decision = "NEEDS_REVIEW";
  }

  return {
    decision,
    rejectionCodes,
    isLowEffort,
    isOffTheme,
    isObviousSpam,
  };
}
