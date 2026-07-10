"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";


export interface OverrideValidationInput {
  id: string;
  status: "accepted" | "rejected";
  reason?: string;
}

export interface BulkOverrideValidationInput {
  ids?: string[];
  status: "accepted" | "rejected";
  reason?: string;
  filter?: {
    validationStatus?: string;
    datasetApprovalStatus?: string;
    search?: string;
    themeId?: string;
  };
}

export interface DatasetApprovalInput {
  id: string;
  reason?: string;
}

export interface BulkDatasetApprovalInput {
  ids?: string[];
  status: "approved" | "removed";
  reason?: string;
  filter?: {
    validationStatus?: string;
    datasetApprovalStatus?: string;
    search?: string;
    themeId?: string;
  };
}

/**
 * Clean up helper to get query conditions from dynamic filter parameters
 */
function getFilterConditions(filter: any) {
  const where: any = {};
  if (filter) {
    if (filter.themeId && filter.themeId !== "all") {
      where.dailyThemeId = filter.themeId;
    }
    if (filter.validationStatus && filter.validationStatus !== "all") {
      if (filter.validationStatus === "effective_rejected") {
        where.effectiveStatus = "rejected";
      } else {
        where.validationStatus = filter.validationStatus;
      }
    }
    if (filter.datasetApprovalStatus && filter.datasetApprovalStatus !== "all") {
      where.datasetApprovalStatus = filter.datasetApprovalStatus;
    }
    if (filter.search && filter.search.trim() !== "") {
      const q = filter.search.trim();
      where.OR = [
        { userId: { contains: q, mode: "insensitive" } },
        { promptOrCaption: { contains: q, mode: "insensitive" } },
        { dailyTheme: { themeText: { contains: q, mode: "insensitive" } } },
      ];
    }
  }
  return where;
}

/**
 * 1. Individual Validation Override
 */
export async function adminOverrideSubmission(input: OverrideValidationInput) {
  try {
    const { id, status, reason } = input;
    
    // Find the current submission
    const existing = await prisma.themeSubmission.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return { success: false, error: "The selected submission record was not found." };
    }

    const finalReason = reason && reason.trim() !== "" ? reason.trim() : null;
    const isRejected = status === "rejected";
    
    // If we override to rejected, 30-day retention begins from this override date
    const retentionUntil = isRejected ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        overriddenByAdmin: true,
        adminOverrideStatus: status,
        effectiveStatus: status,
        adminOverrideReason: finalReason,
        adminOverrideAt: new Date(),
        adminOverrideBy: "Admin Console",
        retentionUntil,
      };

      // If validation status is overridden to rejected, also revoke dataset eligibility (can't train on rejected assets)
      if (isRejected && existing.datasetApprovalStatus === "approved") {
        updateData.datasetApprovalStatus = "removed";
        updateData.datasetRemovedAt = new Date();
        updateData.datasetRemovedBy = "Admin Console System System Override";
        updateData.datasetRemovalReason = "Automatic revocation due to validation status override to rejected.";
        updateData.savedToDataset = false;
      }

      await tx.themeSubmission.update({
        where: { id },
        data: updateData,
      });

      // Write administrative AuditLog trail
      await tx.auditLog.create({
        data: {
          action: "daily_theme_submission_overridden",
          entityType: "ThemeSubmission",
          entityId: id,
          metadataJson: {
            adminOverrideStatus: status,
            originalStatus: existing.originalStatus || existing.validationStatus,
            effectiveStatus: status,
            reason: finalReason,
            retentionUntil: retentionUntil ? retentionUntil.toISOString() : null,
          },
        },
      });
    });

    revalidatePath("/admin/daily-theme");
    return { success: true };
  } catch (error) {
    console.error("Admin validation override failure:", error);
    return { success: false, error: error instanceof Error ? error.message : "System runtime failure." };
  }
}

/**
 * 2. Bulk Validation Override
 */
export async function adminBulkOverrideSubmissions(input: BulkOverrideValidationInput) {
  try {
    const { ids, status, reason, filter } = input;
    const isRejected = status === "rejected";
    const finalReason = reason && reason.trim() !== "" ? reason.trim() : null;
    const retentionUntil = isRejected ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

    let targetIds: string[] = [];

    if (ids && ids.length > 0) {
      targetIds = ids;
    } else if (filter) {
      // Find all match IDs across pages
      const conditions = getFilterConditions(filter);
      const matches = await prisma.themeSubmission.findMany({
        where: conditions,
        select: { id: true },
      });
      targetIds = matches.map((m) => m.id);
    }

    if (targetIds.length === 0) {
      return { success: false, error: "No matching submissions found to perform bulk override." };
    }

    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        overriddenByAdmin: true,
        adminOverrideStatus: status,
        effectiveStatus: status,
        adminOverrideReason: finalReason,
        adminOverrideAt: new Date(),
        adminOverrideBy: "Admin Console Bulk System",
        retentionUntil,
      };

      if (isRejected) {
        updateData.datasetApprovalStatus = "removed";
        updateData.datasetRemovedAt = new Date();
        updateData.datasetRemovedBy = "Admin Console Bulk System Override";
        updateData.datasetRemovalReason = "Automatic bulk revocation due to validation status override to rejected.";
        updateData.savedToDataset = false;
      }

      await tx.themeSubmission.updateMany({
        where: { id: { in: targetIds } },
        data: updateData,
      });

      // Write bulk audit log trail
      await tx.auditLog.create({
        data: {
          action: "daily_theme_bulk_submission_overridden",
          entityType: "ThemeSubmission",
          metadataJson: {
            targetIdsCount: targetIds.length,
            ids: targetIds,
            status,
            reason: finalReason,
          },
        },
      });
    });

    revalidatePath("/admin/daily-theme");
    return { success: true, count: targetIds.length };
  } catch (error) {
    console.error("Admin bulk validation override failure:", error);
    return { success: false, error: error instanceof Error ? error.message : "Bulk system runtime failure." };
  }
}

/**
 * 3. Dataset Enrollment Approval (Must be validation accepted)
 */
export async function adminApproveDataset(input: DatasetApprovalInput) {
  try {
    const { id, reason } = input;
    const existing = await prisma.themeSubmission.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Submission record not found." };
    }

    // Only validation-approved are eligible for dataset cataloging
    const isApproved = existing.effectiveStatus === "accepted" || existing.validationStatus === "accepted";
    if (!isApproved) {
      return {
        success: false,
        error: "Only validation-approved (or admin-overridden-accepted) submissions are eligible for dataset enrollment."
      };
    }

    const finalReason = reason && reason.trim() !== "" ? reason.trim() : null;

    await prisma.$transaction(async (tx) => {
      await tx.themeSubmission.update({
        where: { id },
        data: {
          datasetApprovalStatus: "approved",
          datasetApprovedAt: new Date(),
          datasetApprovedBy: "Admin Console",
          datasetApprovalReason: finalReason,
          savedToDataset: true, // Maintain backwards compatibility
          retentionUntil: null,  // Exempt from deletion since it is enrolled in the dataset
        },
      });

      // Log dataset approval audit trail
      await tx.auditLog.create({
        data: {
          action: "daily_theme_dataset_enrolled",
          entityType: "ThemeSubmission",
          entityId: id,
          metadataJson: {
            reason: finalReason,
            approvedBy: "Admin Console",
          },
        },
      });
    });

    revalidatePath("/admin/daily-theme");
    return { success: true };
  } catch (error) {
    console.error("Admin dataset enrollment failure:", error);
    return { success: false, error: error instanceof Error ? error.message : "System runtime failure." };
  }
}

/**
 * 4. Dataset Enrollment Revocation / Removal (Does not delete the image)
 */
export async function adminRemoveDataset(input: DatasetApprovalInput) {
  try {
    const { id, reason } = input;
    const existing = await prisma.themeSubmission.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Submission record not found." };
    }

    const finalReason = reason && reason.trim() !== "" ? reason.trim() : null;
    const isEffectiveRejected = existing.effectiveStatus === "rejected" || existing.validationStatus === "rejected" || existing.validationStatus === "borderline";
    
    // Set 30-day retention upon dataset removal only if it is also a rejected/borderline asset
    const retentionUntil = isEffectiveRejected ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

    await prisma.$transaction(async (tx) => {
      await tx.themeSubmission.update({
        where: { id },
        data: {
          datasetApprovalStatus: "removed",
          datasetRemovedAt: new Date(),
          datasetRemovedBy: "Admin Console",
          datasetRemovalReason: finalReason,
          savedToDataset: false, // Maintain backwards compatibility
          retentionUntil,
        },
      });

      // Log dataset removal audit trail
      await tx.auditLog.create({
        data: {
          action: "daily_theme_dataset_revoked",
          entityType: "ThemeSubmission",
          entityId: id,
          metadataJson: {
            reason: finalReason,
            revokedBy: "Admin Console",
            retentionUntil: retentionUntil ? retentionUntil.toISOString() : null,
          },
        },
      });
    });

    revalidatePath("/admin/daily-theme");
    return { success: true };
  } catch (error) {
    console.error("Admin dataset revocation failure:", error);
    return { success: false, error: error instanceof Error ? error.message : "System runtime failure." };
  }
}

/**
 * 5. Bulk Dataset approval / removal
 */
export async function adminBulkDatasetApproval(input: BulkDatasetApprovalInput) {
  try {
    const { ids, status, reason, filter } = input;
    const finalReason = reason && reason.trim() !== "" ? reason.trim() : null;
    const isApprovedAction = status === "approved";

    let targetIds: string[] = [];

    if (ids && ids.length > 0) {
      targetIds = ids;
    } else if (filter) {
      const conditions = getFilterConditions(filter);
      const matches = await prisma.themeSubmission.findMany({
        where: conditions,
        select: { id: true },
      });
      targetIds = matches.map((m) => m.id);
    }

    if (targetIds.length === 0) {
      return { success: false, error: "No matching submissions found to perform bulk dataset actions." };
    }

    // Filter target submissions depending on action
    const eligibleSubmissions = await prisma.themeSubmission.findMany({
      where: { id: { in: targetIds } },
    });

    const validatedIds = eligibleSubmissions
      .filter((sub) => {
        if (!isApprovedAction) return true; // Can remove any
        // For enrollment, must be accepted
        return sub.effectiveStatus === "accepted" || sub.validationStatus === "accepted";
      })
      .map((sub) => sub.id);

    if (validatedIds.length === 0) {
      return {
        success: false,
        error: "None of the selected items are eligible for dataset enrollment. Submissions must first be validation accepted."
      };
    }

    await prisma.$transaction(async (tx) => {
      if (isApprovedAction) {
        await tx.themeSubmission.updateMany({
          where: { id: { in: validatedIds } },
          data: {
            datasetApprovalStatus: "approved",
            datasetApprovedAt: new Date(),
            datasetApprovedBy: "Admin Console Bulk System",
            datasetApprovalReason: finalReason,
            savedToDataset: true,
            retentionUntil: null, // Exempt from deletion
          },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            action: "daily_theme_bulk_dataset_enrolled",
            entityType: "ThemeSubmission",
            metadataJson: {
              targetIdsCount: validatedIds.length,
              ids: validatedIds,
              reason: finalReason,
            },
          },
        });
      } else {
        // Removing
        for (const sub of eligibleSubmissions) {
          if (!validatedIds.includes(sub.id)) continue;
          
          const isEffectiveRejected = sub.effectiveStatus === "rejected" || sub.validationStatus === "rejected" || sub.validationStatus === "borderline";
          const retentionUntil = isEffectiveRejected ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

          await tx.themeSubmission.update({
            where: { id: sub.id },
            data: {
              datasetApprovalStatus: "removed",
              datasetRemovedAt: new Date(),
              datasetRemovedBy: "Admin Console Bulk System",
              datasetRemovalReason: finalReason,
              savedToDataset: false,
              retentionUntil,
            },
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            action: "daily_theme_bulk_dataset_revoked",
            entityType: "ThemeSubmission",
            metadataJson: {
              targetIdsCount: validatedIds.length,
              ids: validatedIds,
              reason: finalReason,
            },
          },
        });
      }
    });

    revalidatePath("/admin/daily-theme");
    return { success: true, count: validatedIds.length };
  } catch (error) {
    console.error("Admin bulk dataset action failure:", error);
    return { success: false, error: error instanceof Error ? error.message : "Bulk dataset system runtime failure." };
  }
}

/**
 * 5. Single submission re-validation action
 */
export async function adminRevalidateSubmission(submissionId: string) {
  try {
    if (!submissionId) {
      return { success: false, error: "Submission ID is required." };
    }

    const { validateThemeSubmissionWorkflow } = await import("@/lib/theme-validation/validate-submission");
    await validateThemeSubmissionWorkflow(submissionId, "ADMIN_REVALIDATION");

    const updated = await prisma.themeSubmission.findUnique({
      where: { id: submissionId },
      include: { dailyTheme: true, artist: true },
    });

    revalidatePath("/admin/daily-theme");
    return { success: true, submission: updated };
  } catch (error) {
    console.error("[Admin Actions] Failed to revalidate submission:", error);
    return { success: false, error: error instanceof Error ? error.message : "Internal system runtime failure." };
  }
}


/**
 * Pre-flight cost estimation for bulk validation actions.
 */
export async function adminEstimateRevalidationCost(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return {
        success: true,
        submissionCount: 0,
        expectedRequests: 0,
        providerName: "mock",
        modelName: "mock-vision-v2",
        estimatedCostUsd: 0,
        costWarningRequired: false,
        warningMessage: null,
      };
    }

    const { estimateRevalidationCost } = await import("@/lib/theme-validation/cost-estimator");

    let settings: any = null;
    try {
      settings = await prisma.validationSettings.findUnique({
        where: { id: "global" },
      });
    } catch (err) {
      console.warn("Dynamic settings reading failed for cost preflight:", err);
    }

    const provider = (settings?.provider || process.env.THEME_VALIDATOR_PROVIDER || "mock").trim().toLowerCase();
    const model = (settings?.modelName || process.env.GEMINI_VALIDATION_MODEL || "gemini-2.5-flash").trim();

    const estimation = estimateRevalidationCost(ids.length, provider, model);

    return {
      success: true,
      ...estimation,
    };
  } catch (error) {
    console.error("Bulk cost preflight check failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Internal system error during cost check." };
  }
}

/**
 * Bulk re-validate selected submissions
 */
export async function adminBulkRevalidateSubmissions(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: "No submission IDs provided for bulk revalidation." };
    }

    const { validateThemeSubmissionWorkflow } = await import("@/lib/theme-validation/validate-submission");

    let successCount = 0;
    for (const id of ids) {
      try {
        await validateThemeSubmissionWorkflow(id, "ADMIN_REVALIDATION");
        successCount++;
      } catch (err) {
        console.error(`Bulk revalidation failed for submission ${id}:`, err);
      }
    }

    revalidatePath("/admin/daily-theme");
    return { success: true, total: ids.length, succeeded: successCount };
  } catch (error) {
    console.error("Bulk revalidation failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Bulk revalidation failed." };
  }
}


export interface SetSubmissionStatusInput {
  id: string;
  status: "accepted" | "needs_review" | "rejected";
  note?: string;
}

export async function adminSetSubmissionStatus(input: SetSubmissionStatusInput) {
  try {
    const { id, status, note } = input;
    const existing = await prisma.themeSubmission.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "The selected submission record was not found." };
    }

    const adminNote = note && note.trim() !== "" ? note.trim() : "";
    const isRejected = status === "rejected";

    // Set 30-day retention if rejected
    const retentionUntil = isRejected ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

    let auditAction = "theme_submission_admin_accepted";
    if (status === "needs_review") {
      auditAction = "theme_submission_admin_marked_needs_review";
    } else if (status === "rejected") {
      auditAction = "theme_submission_admin_rejected";
    }

    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        validationStatus: status,
        effectiveStatus: status,
        retentionUntil,
      };

      // If rejected, keep savedToDataset false
      if (isRejected) {
        updateData.savedToDataset = false;
        updateData.datasetApprovalStatus = "removed";
      }

      await tx.themeSubmission.update({
        where: { id },
        data: updateData,
      });

      // Write administrative AuditLog trail
      await tx.auditLog.create({
        data: {
          action: auditAction,
          entityType: "ThemeSubmission",
          entityId: id,
          metadataJson: {
            submissionId: id,
            dailyThemeId: existing.dailyThemeId,
            previousStatus: existing.validationStatus,
            newStatus: status,
            adminNote,
          },
        },
      });
    });

    revalidatePath("/admin/daily-theme");
    return { success: true };
  } catch (error) {
    console.error("Set submission status failure:", error);
    return { success: false, error: error instanceof Error ? error.message : "System runtime failure." };
  }
}

export interface SaveSubmissionToDatasetInput {
  submissionId: string;
  artistId: string;
  datasetVersionId: string;
  licenseRecordId?: string;
  note?: string;
}

export async function adminSaveSubmissionToDataset(input: SaveSubmissionToDatasetInput) {
  try {
    const { submissionId, artistId, datasetVersionId, licenseRecordId, note } = input;
    const existing = await prisma.themeSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!existing) {
      return { success: false, error: "The selected submission record was not found." };
    }

    if (existing.validationStatus !== "accepted") {
      return { success: false, error: "Only accepted submissions can be saved to a dataset." };
    }

    if (existing.savedToDataset) {
      return { success: false, error: "This submission has already been saved to a dataset." };
    }

    const adminNote = note && note.trim() !== "" ? note.trim() : "";

    const filename = existing.imagePath.split("/").pop() || "daily_theme_image.png";

    const result = await prisma.$transaction(async (tx) => {
      // Prevent duplicate DatasetImage records with the same storagePath and datasetVersionId
      const duplicate = await tx.datasetImage.findFirst({
        where: {
          storagePath: existing.imagePath,
          datasetVersionId,
        },
      });

      if (duplicate) {
        throw new Error("This image is already enrolled in the selected dataset version.");
      }

      // Create new DatasetImage record
      const newImage = await tx.datasetImage.create({
        data: {
          datasetVersionId,
          artistId,
          filename,
          storagePath: existing.imagePath,
          caption: existing.promptOrCaption || `Submission for Daily Theme: ${existing.id}`,
          licenseRecordId: licenseRecordId || null,
          qualityStatus: "candidate_from_daily_theme",
          width: 1024,
          height: 1024,
        },
      });

      // Update ThemeSubmission state
      await tx.themeSubmission.update({
        where: { id: submissionId },
        data: {
          savedToDataset: true,
          datasetApprovalStatus: "approved",
          datasetApprovedAt: new Date(),
          datasetApprovedBy: "Admin Console",
          datasetApprovalReason: adminNote,
        },
      });

      // Recalculate selected DatasetVersion.imageCount
      const imageCount = await tx.datasetImage.count({
        where: { datasetVersionId },
      });

      await tx.datasetVersion.update({
        where: { id: datasetVersionId },
        data: { imageCount },
      });

      // Add audit log action: theme_submission_saved_to_dataset
      await tx.auditLog.create({
        data: {
          action: "theme_submission_saved_to_dataset",
          entityType: "ThemeSubmission",
          entityId: submissionId,
          metadataJson: {
            submissionId,
            artistId,
            datasetVersionId,
            datasetImageId: newImage.id,
            imagePath: existing.imagePath,
            caption: existing.promptOrCaption || "",
            adminNote,
          },
        },
      });

      return newImage;
    });

    revalidatePath("/admin/daily-theme");
    revalidatePath("/admin/datasets");
    return { success: true, datasetImage: result };
  } catch (error) {
    console.error("Save submission to dataset failure:", error);
    return { success: false, error: error instanceof Error ? error.message : "System runtime failure." };
  }
}

export interface SaveValidationSettingsInput {
  provider: string;
  modelName: string;
  pretrainedName: string;
  promptStrategy: string;
  rawMin: number;
  rawMax: number;
  acceptThreshold: number;
  rejectThreshold: number;
}

/**
 * 7. Save global similarity validation pipeline settings
 */
export async function adminSaveValidationSettings(input: SaveValidationSettingsInput) {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const settings = await tx.validationSettings.upsert({
        where: { id: "global" },
        update: {
          provider: input.provider,
          modelName: input.modelName,
          pretrainedName: input.pretrainedName,
          promptStrategy: input.promptStrategy,
          rawMin: input.rawMin,
          rawMax: input.rawMax,
          acceptThreshold: input.acceptThreshold,
          rejectThreshold: input.rejectThreshold,
        },
        create: {
          id: "global",
          provider: input.provider,
          modelName: input.modelName,
          pretrainedName: input.pretrainedName,
          promptStrategy: input.promptStrategy,
          rawMin: input.rawMin,
          rawMax: input.rawMax,
          acceptThreshold: input.acceptThreshold,
          rejectThreshold: input.rejectThreshold,
        },
      });

      // Write System Audit log
      await tx.auditLog.create({
        data: {
          action: "validation_settings_updated",
          entityType: "ValidationSettings",
          entityId: "global",
          metadataJson: {
            provider: input.provider,
            modelName: input.modelName,
            pretrainedName: input.pretrainedName,
            promptStrategy: input.promptStrategy,
            rawMin: input.rawMin,
            rawMax: input.rawMax,
            acceptThreshold: input.acceptThreshold,
            rejectThreshold: input.rejectThreshold,
            updatedAt: new Date().toISOString(),
          },
        },
      });

      return settings;
    });

    revalidatePath("/admin/daily-theme");
    return { success: true, settings: updated };
  } catch (error) {
    console.error("[Admin Actions] Failed to save validation settings:", error);
    return { success: false, error: error instanceof Error ? error.message : "Internal database upsert failure." };
  }
}

/**
 * 8. Cleanup rejected submissions older than 30 days
 */
export async function adminCleanupRejectedSubmissions() {
  try {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await prisma.themeSubmission.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        effectiveStatus: "rejected",
        datasetApprovalStatus: "not_approved",
      },
    });

    revalidatePath("/admin/daily-theme");
    return { success: true, deletedCount: result.count };
  } catch (error) {
    console.error("[Admin Actions] Failed to cleanup old rejected submissions:", error);
    return { success: false, error: error instanceof Error ? error.message : "Cleanup action database error." };
  }
}


