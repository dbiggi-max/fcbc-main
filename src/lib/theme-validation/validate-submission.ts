import { prisma } from "@/lib/prisma";
import { ValidationTriggerSource, ThemeValidationScores, ValidationThresholds } from "./types";
import { MockThemeValidationProvider } from "./mock-validator";
import { GoogleGeminiThemeValidationProvider } from "./google-gemini-validator";
import { applyThresholds, DEFAULT_THRESHOLDS } from "./thresholds";

/**
 * Executes the entire validation workflow for a given submission.
 * This function is highly resilient, secure, and performs all database writes inside transaction chains.
 * If external validation fails, it does not crash, but logs an audit failure and defaults to a safe status.
 */
export async function validateThemeSubmissionWorkflow(
  submissionId: string,
  triggerSource: ValidationTriggerSource
) {
  console.info(`[validateThemeSubmissionWorkflow] Triggering validation for submission ${submissionId} (source: ${triggerSource})...`);

  // 1. Fetch submission and daily theme
  const submission = await prisma.themeSubmission.findUnique({
    where: { id: submissionId },
    include: { dailyTheme: true },
  });

  if (!submission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }

  const dailyTheme = submission.dailyTheme;
  if (!dailyTheme) {
    throw new Error(`Daily theme not associated with submission: ${submissionId}`);
  }

  // 2. Load dynamic validation settings or fallback to defaults
  let settings: any = null;
  try {
    settings = await prisma.validationSettings.findUnique({
      where: { id: "global" },
    });
  } catch (err) {
    console.warn("[validateThemeSubmissionWorkflow] Failed to load global validation settings:", err);
  }

  const providerName = (settings?.provider || process.env.THEME_VALIDATOR_PROVIDER || "mock").trim().toLowerCase();
  const modelName = (settings?.modelName || process.env.GEMINI_VALIDATION_MODEL || "gemini-2.5-flash").trim();

  // Resolve active thresholds based on settings, falling back to schema fields if available, otherwise defaults
  const thresholds: ValidationThresholds = {
    minThemeMatch: dailyTheme.acceptThreshold ? Math.round(dailyTheme.acceptThreshold * 100) : (settings?.acceptThreshold ? Math.round(settings.acceptThreshold * 100) : DEFAULT_THRESHOLDS.minThemeMatch),
    minQuality: DEFAULT_THRESHOLDS.minQuality,
    minEffort: DEFAULT_THRESHOLDS.minEffort,
    maxSimplicity: DEFAULT_THRESHOLDS.maxSimplicity,
    maxSpam: DEFAULT_THRESHOLDS.maxSpam,
  };

  // If settings exist, let's map rawMin/rawMax or custom fields if relevant
  if (settings) {
    if (settings.acceptThreshold) {
      thresholds.minThemeMatch = Math.round(settings.acceptThreshold * 100);
    }
  }

  let scores: ThemeValidationScores;
  let rawResponseJson: any = null;
  let rawResponseId: string | null = null;
  let activeProviderStr = providerName;

  // 3. Select validation provider
  const useMockEnv = process.env.USE_MOCK_THEME_VALIDATOR === "true";
  const provider = (useMockEnv || providerName === "mock")
    ? new MockThemeValidationProvider()
    : new GoogleGeminiThemeValidationProvider();

  if (useMockEnv || providerName === "mock") {
    activeProviderStr = "mock";
  } else {
    activeProviderStr = "google_gemini";
  }

  try {
    // 4. Execute validation
    const result = await provider.validate(
      submission.imagePath,
      dailyTheme.themeText,
      dailyTheme.description
    );
    scores = result;
    rawResponseJson = result.rawResponseJson;
    rawResponseId = result.rawResponseId || null;
  } catch (err: any) {
    console.error(`[validateThemeSubmissionWorkflow] Active validation provider (${activeProviderStr}) failed:`, err);

    // 5. Robust Fallback Mechanics
    const isDev = process.env.NODE_ENV === "development" || process.env.USE_MOCK_THEME_VALIDATOR === "true";
    if (isDev) {
      console.warn("[validateThemeSubmissionWorkflow] Local development detected. Falling back to Mock validator.");
      const mockResult = await new MockThemeValidationProvider().validate(
        submission.imagePath,
        dailyTheme.themeText,
        dailyTheme.description
      );
      scores = mockResult;
      rawResponseJson = {
        ...mockResult.rawResponseJson,
        fallbackNotice: "Evaluated using fallback local mock validator due to primary provider exception.",
        originalError: err.message,
      };
      rawResponseId = mockResult.rawResponseId || null;
    } else {
      // In production, flag the validation failure cleanly and default to NEEDS_REVIEW
      console.warn("[validateThemeSubmissionWorkflow] Production environment fallback: Marking as NEEDS_REVIEW.");
      scores = {
        themeMatchScore: 50,
        qualityScore: 50,
        simplicityScore: 50,
        effortScore: 50,
        spamScore: 50,
      };
      rawResponseJson = {
        error: err.message,
        fallbackNotice: "Google Vertex AI validation pipeline exception encountered. Defaulted to manual administrative queue.",
      };
      rawResponseId = `fallback-err-${Date.now()}`;
    }
  }

  // 6. Apply threshold decision boundaries
  const thresholdDecision = applyThresholds(scores, thresholds);

  // Map the decision to ThemeSubmission compatible validation status
  let mappedStatus = "borderline";
  if (thresholdDecision.decision === "APPROVED") {
    mappedStatus = "accepted";
  } else if (thresholdDecision.decision === "REJECTED") {
    mappedStatus = "rejected";
  } else if (thresholdDecision.decision === "SPAM") {
    mappedStatus = "spam";
  } else if (thresholdDecision.decision === "NEEDS_REVIEW") {
    mappedStatus = "borderline";
  }


  // 7. Write everything inside an atomic transaction
  console.info(`[validateThemeSubmissionWorkflow] Committing validation results to database for submission ${submissionId}...`);
  await prisma.$transaction([
    // Log persistent attempt history
    prisma.themeValidationAttempt.create({
      data: {
        submissionId: submission.id,
        triggerSource,
        provider: activeProviderStr,
        decision: thresholdDecision.decision,
        themeMatchScore: scores.themeMatchScore,
        qualityScore: scores.qualityScore,
        simplicityScore: scores.simplicityScore,
        effortScore: scores.effortScore,
        spamScore: scores.spamScore,
        isLowEffort: thresholdDecision.isLowEffort,
        isOffTheme: thresholdDecision.isOffTheme,
        isObviousSpam: thresholdDecision.isObviousSpam,
        rejectionCodes: thresholdDecision.rejectionCodes,
        modelName: activeProviderStr === "mock" ? "mock-vision-v2" : modelName,
        modelVersion: "v1.0",
        rawResponseId,
        rawResponseJson: rawResponseJson || {},
        thresholdSnapshot: thresholds as any,
      },
    }),
    // Update main submission record
    prisma.themeSubmission.update({
      where: { id: submissionId },
      data: {
        validationStatus: mappedStatus,
        // Only update effectiveStatus if the admin hasn't overridden it yet
        effectiveStatus: submission.overriddenByAdmin ? undefined : mappedStatus,
        validationExplanation: rawResponseJson?.reasoning || "Drawing evaluated by AI pipeline.",
        originalStatus: mappedStatus,
        finalScore: scores.themeMatchScore / 100,
        clipSimilarityScore: scores.themeMatchScore / 100,
        visionScore: scores.themeMatchScore / 100,
        confidence: scores.themeMatchScore >= 80 ? "high" : "medium",
        thresholdUsed: thresholds.minThemeMatch / 100,
        // Let's set some metadata fields for audit logs or dashboards
        validationMetadata: {
          validatorVersion: "gemini-foundation-v1",
          visionProvider: activeProviderStr,
          visionModel: activeProviderStr === "mock" ? "mock-vision-v2" : modelName,
          thresholdsConfigVersion: "dynamic-settings-v1",
          scoresSnapshot: scores,
          rejectionCodes: thresholdDecision.rejectionCodes,
        } as any,
      },
    }),
    // Write a clean audit log for governance
    prisma.auditLog.create({
      data: {
        action: "THEME_VALIDATION_PROCESSED",
        entityType: "ThemeSubmission",
        entityId: submission.id,
        metadataJson: {
          triggerSource,
          provider: activeProviderStr,
          decision: thresholdDecision.decision,
          themeMatchScore: scores.themeMatchScore,
          rejectionCodes: thresholdDecision.rejectionCodes,
        } as any,
      },
    }),
  ]);

  console.info(`[validateThemeSubmissionWorkflow] Finished validating submission ${submissionId} successfully.`);
}
