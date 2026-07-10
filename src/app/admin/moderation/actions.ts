"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { validateThemeSubmissionWorkflow } from "@/lib/theme-validation/validate-submission";
import { revalidatePath } from "next/cache";

/**
 * Single & Bulk status update moderation action.
 */
export async function moderationActionSubmit(
  submissionIds: string[],
  status: "accepted" | "rejected" | "spam" | "borderline",
  reason?: string
) {
  const admin = await requireAdmin();

  let successCount = 0;
  const timestamp = new Date();

  // Process updates inside a sequence to ensure individual records update and trigger auditing/notifications
  for (const id of submissionIds) {
    try {
      const submission = await prisma.themeSubmission.findUnique({
        where: { id },
        select: { id: true, userId: true, effectiveStatus: true },
      });

      if (!submission) continue;

      const previousStatus = submission.effectiveStatus;

      // Update main submission record with admin overrides
      await prisma.themeSubmission.update({
        where: { id },
        data: {
          effectiveStatus: status,
          overriddenByAdmin: true,
          adminOverrideStatus: status,
          adminOverrideReason: reason || "Admin override via Moderation Dashboard.",
          adminOverrideAt: timestamp,
          adminOverrideBy: admin.id,
          // Sync main validationStatus to match effectiveStatus for UI simplicity
          validationStatus: status,
        },
      });

      // Create detailed Audit Log
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "SUBMISSION_MODERATED",
          entityType: "ThemeSubmission",
          entityId: id,
          metadataJson: {
            previousStatus,
            newStatus: status,
            overrideReason: reason || "Moderation Dashboard override",
            timestamp: timestamp.toISOString(),
          } as any,
        },
      });

      // If status is rejected, create user safe in-app notification
      if (status === "rejected" && submission.userId) {
        await prisma.notification.create({
          data: {
            userId: submission.userId,
            type: "SUBMISSION_STATUS",
            title: "Submission Status Update",
            message: "Your drawing was reviewed and was not selected for publication.",
            relatedSubmissionId: id,
          },
        });

        // Audit the notification creation
        await prisma.auditLog.create({
          data: {
            actorId: admin.id,
            action: "NOTIFICATION_CREATED",
            entityType: "Notification",
            entityId: id,
            metadataJson: {
              notificationType: "SUBMISSION_STATUS",
              recipientUserId: submission.userId,
              reason: "Submission rejected by admin",
            } as any,
          },
        });
      }

      successCount++;
    } catch (err) {
      console.error(`Failed to moderate submission ${id}:`, err);
    }
  }

  // Audit bulk action summary if more than 1 submission was edited
  if (submissionIds.length > 1) {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "BULK_SUBMISSION_MODERATED",
        entityType: "ThemeSubmission",
        metadataJson: {
          targetCount: submissionIds.length,
          successCount,
          newStatus: status,
          timestamp: timestamp.toISOString(),
        } as any,
      },
    });
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/dashboard");
  revalidatePath("/daily-theme");

  return { success: true, successCount, skippedCount: submissionIds.length - successCount };
}

/**
 * Publish / Unpublish from gallery moderation action.
 */
export async function moderationPublishAction(
  submissionIds: string[],
  publish: boolean
) {
  const admin = await requireAdmin();

  let successCount = 0;
  let skippedCount = 0;
  const timestamp = new Date();

  for (const id of submissionIds) {
    try {
      const submission = await prisma.themeSubmission.findUnique({
        where: { id },
        select: { id: true, userId: true, effectiveStatus: true, deletedAt: true },
      });

      if (!submission) {
        skippedCount++;
        continue;
      }

      // Rules:
      // 1. Only non-deleted submissions can be published
      if (submission.deletedAt) {
        skippedCount++;
        continue;
      }

      // 2. Only approved (accepted) submissions can be published
      if (publish && submission.effectiveStatus !== "accepted") {
        skippedCount++;
        continue;
      }

      if (publish) {
        await prisma.themeSubmission.update({
          where: { id },
          data: {
            isPublishedToGallery: true,
            publishedAt: timestamp,
            publishedByAdminId: admin.id,
            galleryVisibility: "public",
          },
        });

        // Audit the gallery publish action
        await prisma.auditLog.create({
          data: {
            actorId: admin.id,
            action: "GALLERY_PUBLISHED",
            entityType: "ThemeSubmission",
            entityId: id,
            metadataJson: {
              timestamp: timestamp.toISOString(),
            } as any,
          },
        });

        // In-app notification for publishing
        if (submission.userId) {
          await prisma.notification.create({
            data: {
              userId: submission.userId,
              type: "SUBMISSION_STATUS",
              title: "Selected for Gallery!",
              message: "Your drawing was selected for the public gallery.",
              relatedSubmissionId: id,
            },
          });

          // Audit notification creation
          await prisma.auditLog.create({
            data: {
              actorId: admin.id,
              action: "NOTIFICATION_CREATED",
              entityType: "Notification",
              entityId: id,
              metadataJson: {
                notificationType: "SUBMISSION_STATUS",
                recipientUserId: submission.userId,
                reason: "Submission published to gallery",
              } as any,
            },
          });
        }
      } else {
        // Unpublish
        await prisma.themeSubmission.update({
          where: { id },
          data: {
            isPublishedToGallery: false,
            unpublishedAt: timestamp,
            galleryVisibility: "private",
          },
        });

        // Audit the gallery unpublish action
        await prisma.auditLog.create({
          data: {
            actorId: admin.id,
            action: "GALLERY_UNPUBLISHED",
            entityType: "ThemeSubmission",
            entityId: id,
            metadataJson: {
              timestamp: timestamp.toISOString(),
            } as any,
          },
        });
      }

      successCount++;
    } catch (err) {
      console.error(`Failed to change gallery status for submission ${id}:`, err);
      skippedCount++;
    }
  }

  // Audit bulk publishing summary if applicable
  if (submissionIds.length > 1) {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: publish ? "BULK_GALLERY_PUBLISHED" : "BULK_GALLERY_UNPUBLISHED",
        entityType: "ThemeSubmission",
        metadataJson: {
          targetCount: submissionIds.length,
          successCount,
          skippedCount,
          timestamp: timestamp.toISOString(),
        } as any,
      },
    });
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/dashboard");
  revalidatePath("/gallery");

  return { success: true, successCount, skippedCount };
}

/**
 * Manually trigger validation engine revalidation action.
 */
export async function moderationRevalidateAction(submissionIds: string[]) {
  const admin = await requireAdmin();

  let successCount = 0;
  let failedCount = 0;
  const timestamp = new Date();

  // Create an initial audit log entry representing the manual request
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "MANUAL_REVALIDATION_REQUESTED",
      entityType: "ThemeSubmission",
      metadataJson: {
        requestedCount: submissionIds.length,
        submissionIds,
        timestamp: timestamp.toISOString(),
      } as any,
    },
  });

  for (const id of submissionIds) {
    try {
      // Execute the validation pipeline with source ADMIN_REVALIDATION
      await validateThemeSubmissionWorkflow(id, "ADMIN_REVALIDATION");

      // Audit validation completion for each submission
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "MANUAL_REVALIDATION_COMPLETED",
          entityType: "ThemeSubmission",
          entityId: id,
          metadataJson: {
            timestamp: new Date().toISOString(),
          } as any,
        },
      });

      successCount++;
    } catch (err: any) {
      console.error(`Failed manual revalidation for submission ${id}:`, err);

      // Audit validation failure for governance
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "MANUAL_REVALIDATION_FAILED",
          entityType: "ThemeSubmission",
          entityId: id,
          metadataJson: {
            error: err.message || "Unknown error during validation execution",
            timestamp: new Date().toISOString(),
          } as any,
        },
      });

      failedCount++;
    }
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/dashboard");

  return { success: true, successCount, failedCount };
}
