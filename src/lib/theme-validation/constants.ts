/**
 * Constants governing the theme-validation scoring pipeline,
 * decision boundaries, weights, and data retention windows.
 */

// Raw weighted-score defaults. DailyTheme values override both boundaries.
// These are deliberately review-heavy MVP defaults and must be calibrated on adjudicated data.
export const DEFAULT_ACCEPT_THRESHOLD = 0.12;
export const DEFAULT_REVIEW_THRESHOLD = 0.04;

// Multimodal relevance score threshold (Gemini Vision). Scores >= this are semantically accepted.
export const VISION_ACCEPT_THRESHOLD = 0.65;

// Multimodal score threshold (Gemini Vision) above which a submission is considered borderline. Below is rejected.
export const VISION_BORDERLINE_THRESHOLD = 0.45;

// Weight given to Gemini Vision score vs OpenCLIP score for abstract daily themes.
export const ABSTRACT_THEME_VISION_WEIGHT = 0.70;

export const POSITIVE_WEIGHT = 0.50;
export const CAPTION_WEIGHT = 0.25;
export const MARGIN_WEIGHT = 0.25;

// Retention window in days for rejected or borderline submissions.
export const RETENTION_DAYS_REJECTED = 30;
