"use server";

import { prisma } from "@/lib/prisma";
import { assertSubmissionOwnerOrAdmin } from "@/lib/security";
import { revalidatePath } from "next/cache";

/**
 * Soft deletes a user's theme submission, keeping the record and metadata
 * intact for admin recovery up to 30 days.
 */
export async function softDeleteSubmission(submissionId: string) {
  try {
    // 1. Ensure security constraints: user must own submission or be admin
    await assertSubmissionOwnerOrAdmin(submissionId);

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 2. Perform soft deletion update
    const updatedSubmission = await prisma.themeSubmission.update({
      where: { id: submissionId },
      data: {
        deletedAt: new Date(),
        recoveryUntil: thirtyDaysFromNow,
        cleanupStatus: "queued_for_purge",
      },
    });

    // 3. Create audit trail
    await prisma.auditLog.create({
      data: {
        action: "submission_soft_delete",
        entityType: "ThemeSubmission",
        entityId: submissionId,
        metadataJson: {
          imagePath: updatedSubmission.imagePath,
          recoveryUntil: thirtyDaysFromNow.toISOString(),
        },
      },
    });

    // 4. Revalidate cache on affected views
    revalidatePath("/dashboard");
    revalidatePath("/daily-theme");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to soft delete drawing" };
  }
}
