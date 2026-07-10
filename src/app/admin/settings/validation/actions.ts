"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { revalidatePath } from "next/cache";

/**
 * Save Global Validation threshold settings.
 */
export async function saveGlobalSettingsAction(data: {
  minThemeMatchScore: number;
  minQualityScore: number;
  minEffortScore: number;
  maxSpamScore: number;
  maxSimplicityScore: number;
}) {
  const admin = await requireAdmin();

  const timestamp = new Date();

  // Upsert global configuration
  const settings = await prisma.validationSettings.upsert({
    where: { id: "global" },
    update: {
      minThemeMatchScore: data.minThemeMatchScore,
      minQualityScore: data.minQualityScore,
      minEffortScore: data.minEffortScore,
      maxSpamScore: data.maxSpamScore,
      maxSimplicityScore: data.maxSimplicityScore,
    },
    create: {
      id: "global",
      minThemeMatchScore: data.minThemeMatchScore,
      minQualityScore: data.minQualityScore,
      minEffortScore: data.minEffortScore,
      maxSpamScore: data.maxSpamScore,
      maxSimplicityScore: data.maxSimplicityScore,
    },
  });

  // Log audit entry
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "THRESHOLD_SETTINGS_UPDATED",
      entityType: "ValidationSettings",
      entityId: "global",
      metadataJson: {
        ...data,
        timestamp: timestamp.toISOString(),
      } as any,
    },
  });

  revalidatePath("/admin/settings/validation");
  revalidatePath("/admin/moderation");

  return { success: true, settings };
}

/**
 * Save per-theme Validation threshold overrides.
 */
export async function saveThemeOverrideSettingsAction(
  themeId: string,
  data: {
    minThemeMatchScore: number | null;
    minQualityScore: number | null;
    minEffortScore: number | null;
    maxSpamScore: number | null;
    maxSimplicityScore: number | null;
  }
) {
  const admin = await requireAdmin();

  const timestamp = new Date();

  // Update theme record with custom overrides
  const updatedTheme = await prisma.dailyTheme.update({
    where: { id: themeId },
    data: {
      minThemeMatchScore: data.minThemeMatchScore,
      minQualityScore: data.minQualityScore,
      minEffortScore: data.minEffortScore,
      maxSpamScore: data.maxSpamScore,
      maxSimplicityScore: data.maxSimplicityScore,
    },
  });

  // Log audit entry
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "THEME_THRESHOLD_OVERRIDE_UPDATED",
      entityType: "DailyTheme",
      entityId: themeId,
      metadataJson: {
        ...data,
        timestamp: timestamp.toISOString(),
      } as any,
    },
  });

  revalidatePath("/admin/settings/validation");
  revalidatePath("/admin/moderation");

  return { success: true, theme: updatedTheme };
}
