import { prisma } from "@/lib/prisma";
import { getJapanDateKey } from "./date";
import { DailyThemeLite } from "./types";

/**
 * Publicly query the current active DailyTheme for the current Japan date.
 * Hides all internal admin/AI logs and details to prevent data leakage.
 */
export async function getCurrentDailyTheme(): Promise<DailyThemeLite | null> {
  const dateKey = getJapanDateKey();

  const activation = await prisma.dailyThemeActivation.findUnique({
    where: { dateKey },
    include: {
      dailyTheme: true,
    },
  });

  if (!activation || activation.dailyTheme.status === "DISABLED") {
    return null;
  }

  const t = activation.dailyTheme;

  return {
    id: t.id,
    themeText: t.themeText,
    themeDate: t.themeDate,
    description: t.description,
    status: t.status,
    minThemeMatchScore: t.minThemeMatchScore,
    minQualityScore: t.minQualityScore,
    minEffortScore: t.minEffortScore,
    maxSpamScore: t.maxSpamScore,
    maxSimplicityScore: t.maxSimplicityScore,
  };
}

/**
 * Returns a list of the last 90 days of curated daily challenge theme texts
 * so that we can feed them into the negative context AI prompt arrays.
 */
export async function getRecentActiveThemeTexts(days: number = 90): Promise<string[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const activeThemes = await prisma.dailyTheme.findMany({
    where: {
      createdAt: { gte: cutoffDate },
      status: { in: ["active", "ACTIVE"] },
    },
    select: {
      themeText: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100, // Safe capping
  });

  return activeThemes.map((t) => t.themeText);
}
