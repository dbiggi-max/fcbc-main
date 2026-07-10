-- Theme-specific calibration and prompt ensembles
ALTER TABLE "DailyTheme"
ADD COLUMN IF NOT EXISTS "positivePrompts" JSONB,
ADD COLUMN IF NOT EXISTS "negativePrompts" JSONB,
ADD COLUMN IF NOT EXISTS "acceptThreshold" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "reviewThreshold" DOUBLE PRECISION;

-- Versioned multi-signal evidence retained with each decision
ALTER TABLE "ThemeSubmission"
ADD COLUMN IF NOT EXISTS "originalStatus" TEXT,
ADD COLUMN IF NOT EXISTS "effectiveStatus" TEXT,
ADD COLUMN IF NOT EXISTS "finalScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "positiveScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "negativeScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "marginScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "captionThemeScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "backgroundZScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "generatedCaption" TEXT,
ADD COLUMN IF NOT EXISTS "thresholdUsed" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "visionScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "confidence" TEXT,
ADD COLUMN IF NOT EXISTS "detectedConcepts" TEXT,
ADD COLUMN IF NOT EXISTS "interpretationType" TEXT,
ADD COLUMN IF NOT EXISTS "validationMetadata" JSONB,
ADD COLUMN IF NOT EXISTS "overriddenByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "adminOverrideStatus" TEXT,
ADD COLUMN IF NOT EXISTS "adminOverrideReason" TEXT,
ADD COLUMN IF NOT EXISTS "adminOverrideAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "adminOverrideBy" TEXT,
ADD COLUMN IF NOT EXISTS "datasetApprovalStatus" TEXT NOT NULL DEFAULT 'not_approved',
ADD COLUMN IF NOT EXISTS "datasetApprovedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "datasetApprovedBy" TEXT,
ADD COLUMN IF NOT EXISTS "datasetRemovedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "datasetRemovedBy" TEXT,
ADD COLUMN IF NOT EXISTS "datasetApprovalReason" TEXT,
ADD COLUMN IF NOT EXISTS "datasetRemovalReason" TEXT,
ADD COLUMN IF NOT EXISTS "retentionUntil" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ThemeSubmission_effectiveStatus_idx"
ON "ThemeSubmission"("effectiveStatus");

CREATE INDEX IF NOT EXISTS "ThemeSubmission_datasetApprovalStatus_idx"
ON "ThemeSubmission"("datasetApprovalStatus");
