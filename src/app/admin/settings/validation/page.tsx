import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import SettingsWorkspace from "./SettingsWorkspace";

export const revalidate = 0; // Ensure fresh loads from database

export default async function AdminValidationSettingsPage() {
  // Enforce secure administrative check
  await requireAdmin();

  // Load global settings or provide robust system fallbacks
  const globalSettingsResult = await prisma.validationSettings.findUnique({
    where: { id: "global" },
  });

  const globalSettings = {
    minThemeMatchScore: globalSettingsResult?.minThemeMatchScore ?? 75,
    minQualityScore: globalSettingsResult?.minQualityScore ?? 50,
    minEffortScore: globalSettingsResult?.minEffortScore ?? 40,
    maxSpamScore: globalSettingsResult?.maxSpamScore ?? 30,
    maxSimplicityScore: globalSettingsResult?.maxSimplicityScore ?? 60,
  };

  // Load active and historic themes to edit overrides
  const themes = await prisma.dailyTheme.findMany({
    orderBy: {
      themeDate: "desc",
    },
    select: {
      id: true,
      themeText: true,
      description: true,
      themeDate: true,
      minThemeMatchScore: true,
      minQualityScore: true,
      minEffortScore: true,
      maxSpamScore: true,
      maxSimplicityScore: true,
    },
  });

  return (
    <SettingsWorkspace
      initialGlobalSettings={globalSettings}
      themes={themes}
    />
  );
}
