/**
 * Typings for the Google-based and Mock Daily Theme drawing validation engine.
 */

export type ValidationTriggerSource = 
  | "INITIAL_SUBMISSION" 
  | "ADMIN_REVALIDATION" 
  | "THRESHOLD_CHANGE" 
  | "MODEL_UPDATE";

export type ValidationDecision = 
  | "APPROVED" 
  | "NEEDS_REVIEW" 
  | "REJECTED" 
  | "SPAM";

export interface ThemeValidationScores {
  themeMatchScore: number; // 0-100
  qualityScore: number;    // 0-100
  simplicityScore: number; // 0-100
  effortScore: number;     // 0-100
  spamScore: number;       // 0-100
}

export interface ValidationThresholds {
  minThemeMatch: number;      // e.g. 75
  minQuality: number;         // e.g. 50
  minEffort: number;          // e.g. 40
  maxSimplicity: number;      // e.g. 60
  maxSpam: number;            // e.g. 30
}

export interface ThemeValidationRawResult extends ThemeValidationScores {
  decision: ValidationDecision;
  isLowEffort: boolean;
  isOffTheme: boolean;
  isObviousSpam: boolean;
  rejectionCodes: string[];
  modelName: string;
  modelVersion: string;
  rawResponseId?: string | null;
  rawResponseJson?: any;
  createdAt?: Date;
}

export interface ThemeValidationProvider {
  validate(
    imagePath: string,
    themeText: string,
    themeDescription: string | null
  ): Promise<ThemeValidationScores & { rawResponseJson: any; rawResponseId?: string | null }>;
}

// For backward-compatibility with the existing OpenCLIP validator if needed
export interface ThemeValidationInput {
  imagePath: string;
  themeText: string;
  caption?: string | null;
  positivePrompts?: string[] | null;
  negativePrompts?: string[] | null;
  acceptThreshold?: number | null;
  reviewThreshold?: number | null;
  validationSettings?: any;
}

export interface ThemeValidationResult {
  accepted: boolean;
  status: string;
  effectiveStatus: string;
  finalScore: number;
  displayScore: number;
  positiveScore: number;
  negativeScore: number;
  marginScore: number;
  visionScore: number | null;
  thresholdUsed: number;
  confidence: "low" | "medium" | "high";
  reason: string;
  detectedConcepts: string[];
  interpretationType: string;
  validationModelMetadata: {
    openClipModel?: string | null;
    visionProvider?: string | null;
    visionModel?: string | null;
    validatorVersion: string;
    thresholdsConfigVersion: string;
    positivePromptCount?: number;
    negativePromptCount?: number;
    scoreWeights?: Record<string, number>;
  };
}

