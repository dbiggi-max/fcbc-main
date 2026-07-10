"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { revalidatePath } from "next/cache";

export interface CreateScheduledThemeInput {
  title: string; // mapped to themeText
  description: string;
  rules: string;
  scheduledForDateKey: string; // e.g. "2026-07-12"
}

/**
 * Creates a future admin-scheduled DailyTheme challenge.
 */
export async function adminCreateScheduledTheme(input: CreateScheduledThemeInput) {
  try {
    const admin = await requireAdmin();

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(input.scheduledForDateKey)) {
      return { success: false, error: "Scheduled date must be in YYYY-MM-DD format." };
    }

    // Check if there is already a theme scheduled for that date key
    const existingScheduled = await prisma.dailyTheme.findFirst({
      where: {
        scheduledForDateKey: input.scheduledForDateKey,
        status: "SCHEDULED",
      },
    });

    if (existingScheduled) {
      return {
        success: false,
        error: `There is already an active theme "${existingScheduled.themeText}" scheduled for ${input.scheduledForDateKey}. Please disable or remove it first.`,
      };
    }

    const theme = await prisma.$transaction(async (tx) => {
      const created = await tx.dailyTheme.create({
        data: {
          themeText: input.title,
          themeDate: new Date(input.scheduledForDateKey + "T00:00:00Z"), // approximate UTC midnight
          description: input.description,
          status: "SCHEDULED",
          source: "ADMIN",
          scheduledForDateKey: input.scheduledForDateKey,
          positivePrompts: { rules: input.rules }, // Store rules inside positive prompts JSON for schema compatibility if needed, but we also save description/rules
        },
      });

      // Write System Audit log
      await tx.auditLog.create({
        data: {
          action: "admin_theme_scheduled",
          entityType: "DailyTheme",
          entityId: created.id,
          actorId: admin.id,
          metadataJson: {
            title: input.title,
            scheduledForDateKey: input.scheduledForDateKey,
            description: input.description,
            rules: input.rules,
          },
        },
      });

      return created;
    });

    revalidatePath("/admin/themes");
    return { success: true, theme };
  } catch (error) {
    console.error("[Admin Actions] Create scheduled theme failure:", error);
    return { success: false, error: error instanceof Error ? error.message : "Database write failure." };
  }
}

/**
 * Toggles a daily theme's operational status (e.g. active to disabled).
 */
export async function adminToggleThemeStatus(themeId: string, status: "active" | "active" | "DISABLED" | "SCHEDULED") {
  try {
    const admin = await requireAdmin();

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.dailyTheme.update({
        where: { id: themeId },
        data: { status },
      });

      await tx.auditLog.create({
        data: {
          action: "admin_theme_status_updated",
          entityType: "DailyTheme",
          entityId: themeId,
          actorId: admin.id,
          metadataJson: {
            themeText: u.themeText,
            newStatus: status,
          },
        },
      });

      return u;
    });

    revalidatePath("/admin/themes");
    return { success: true, theme: updated };
  } catch (error) {
    console.error("[Admin Actions] Theme status update failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Database write failure." };
  }
}
