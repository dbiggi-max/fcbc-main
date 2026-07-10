-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentOrLicenseRecord" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "rightsBasis" TEXT NOT NULL,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "commercialAllowed" BOOLEAN NOT NULL DEFAULT false,
    "trainingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "attributionRequired" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentOrLicenseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetVersion" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "versionName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "storagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetImage" (
    "id" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "licenseRecordId" TEXT,
    "caption" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sha256Hash" TEXT,
    "qualityStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelAdapter" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "datasetVersionId" TEXT,
    "adapterName" TEXT NOT NULL,
    "baseModel" TEXT NOT NULL,
    "adapterType" TEXT NOT NULL DEFAULT 'lora',
    "filePath" TEXT,
    "triggerToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "trainingNotebookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelAdapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "artistId" TEXT NOT NULL,
    "modelAdapterId" TEXT,
    "datasetVersionId" TEXT,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "seed" INTEGER,
    "parametersJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "outputImagePath" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoyaltyEvent" (
    "id" TEXT NOT NULL,
    "generationRequestId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "status" TEXT NOT NULL DEFAULT 'simulated',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoyaltyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTheme" (
    "id" TEXT NOT NULL,
    "themeText" TEXT NOT NULL,
    "themeDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeSubmission" (
    "id" TEXT NOT NULL,
    "dailyThemeId" TEXT NOT NULL,
    "userId" TEXT,
    "artistId" TEXT,
    "imagePath" TEXT NOT NULL,
    "promptOrCaption" TEXT,
    "clipSimilarityScore" DOUBLE PRECISION,
    "validationStatus" TEXT NOT NULL DEFAULT 'pending',
    "savedToDataset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist"("slug");

-- CreateIndex
CREATE INDEX "DatasetVersion_artistId_idx" ON "DatasetVersion"("artistId");

-- CreateIndex
CREATE INDEX "DatasetImage_artistId_idx" ON "DatasetImage"("artistId");

-- CreateIndex
CREATE INDEX "DatasetImage_datasetVersionId_idx" ON "DatasetImage"("datasetVersionId");

-- CreateIndex
CREATE INDEX "ModelAdapter_artistId_idx" ON "ModelAdapter"("artistId");

-- CreateIndex
CREATE INDEX "GenerationRequest_artistId_idx" ON "GenerationRequest"("artistId");

-- CreateIndex
CREATE INDEX "GenerationRequest_status_idx" ON "GenerationRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RoyaltyEvent_generationRequestId_key" ON "RoyaltyEvent"("generationRequestId");

-- CreateIndex
CREATE INDEX "RoyaltyEvent_artistId_idx" ON "RoyaltyEvent"("artistId");

-- CreateIndex
CREATE INDEX "DailyTheme_themeDate_idx" ON "DailyTheme"("themeDate");

-- CreateIndex
CREATE INDEX "ThemeSubmission_dailyThemeId_idx" ON "ThemeSubmission"("dailyThemeId");

-- CreateIndex
CREATE INDEX "ThemeSubmission_validationStatus_idx" ON "ThemeSubmission"("validationStatus");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "ConsentOrLicenseRecord" ADD CONSTRAINT "ConsentOrLicenseRecord_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetVersion" ADD CONSTRAINT "DatasetVersion_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetImage" ADD CONSTRAINT "DatasetImage_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetImage" ADD CONSTRAINT "DatasetImage_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetImage" ADD CONSTRAINT "DatasetImage_licenseRecordId_fkey" FOREIGN KEY ("licenseRecordId") REFERENCES "ConsentOrLicenseRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelAdapter" ADD CONSTRAINT "ModelAdapter_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelAdapter" ADD CONSTRAINT "ModelAdapter_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRequest" ADD CONSTRAINT "GenerationRequest_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRequest" ADD CONSTRAINT "GenerationRequest_modelAdapterId_fkey" FOREIGN KEY ("modelAdapterId") REFERENCES "ModelAdapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRequest" ADD CONSTRAINT "GenerationRequest_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyEvent" ADD CONSTRAINT "RoyaltyEvent_generationRequestId_fkey" FOREIGN KEY ("generationRequestId") REFERENCES "GenerationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyEvent" ADD CONSTRAINT "RoyaltyEvent_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeSubmission" ADD CONSTRAINT "ThemeSubmission_dailyThemeId_fkey" FOREIGN KEY ("dailyThemeId") REFERENCES "DailyTheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeSubmission" ADD CONSTRAINT "ThemeSubmission_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
