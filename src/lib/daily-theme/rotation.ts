import { prisma } from "@/lib/prisma";
import { generateAIFallbackTheme } from "./ai-theme-generator";
import { getRecentActiveThemeTexts } from "./queries";
import { ThemeRotationResult, ThemeRotationOptions } from "./types";

/**
 * Rotates the daily theme for a specific target JST Date Key (e.g. YYYY-MM-DD).
 * Fully idempotent, secured against race conditions via unique index transactions.
 */
export async function rotateDailyThemeForDate(
  dateKey: string,
  options: ThemeRotationOptions = {}
): Promise<ThemeRotationResult> {
  const triggerSource = options.triggerSource || "CRON";
  const adminId = options.adminId || "system";

  // 1. Strict pattern check YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateKey)) {
    return {
      success: false,
      dateKey,
      activatedThemeId: null,
      themeText: null,
      source: "AI_FALLBACK",
      isNewActivation: false,
      error: `Invalid dateKey format: ${dateKey}. Must be YYYY-MM-DD.`,
    };
  }

  try {
    // 2. Double-Check if activation already exists for today (Primary Idempotency read)
    const existing = await prisma.dailyThemeActivation.findUnique({
      where: { dateKey },
      include: { dailyTheme: true },
    });

    if (existing) {
      console.info(`[Daily-Theme-Rotation] Theme for date ${dateKey} is already active: "${existing.dailyTheme.themeText}" (Idempotence hit).`);
      return {
        success: true,
        dateKey,
        activatedThemeId: existing.dailyThemeId,
        themeText: existing.dailyTheme.themeText,
        source: existing.source as "ADMIN" | "AI_FALLBACK",
        isNewActivation: false,
      };
    }

    // 3. Initiate Transaction to activate or generate new theme
    const result = await prisma.$transaction(async (tx) => {
      // Secondary check inside transaction to serialize concurrent runs
      const doubleCheck = await tx.dailyThemeActivation.findUnique({
        where: { dateKey },
        include: { dailyTheme: true },
      });
      if (doubleCheck) {
        return {
          success: true,
          dateKey,
          activatedThemeId: doubleCheck.dailyThemeId,
          themeText: doubleCheck.dailyTheme.themeText,
          source: doubleCheck.source as "ADMIN" | "AI_FALLBACK",
          isNewActivation: false,
        };
      }

      // 4. Look for Admin-Scheduled Daily Themes
      const scheduledTheme = await tx.dailyTheme.findFirst({
        where: {
          scheduledForDateKey: dateKey,
          status: { in: ["SCHEDULED", "scheduled"] },
        },
        orderBy: { createdAt: "asc" },
      });

      if (scheduledTheme) {
        // Activate admin scheduled theme
        const activated = await tx.dailyTheme.update({
          where: { id: scheduledTheme.id },
          data: {
            status: "active",
            themeDate: new Date(),
          },
        });

        // Write activation log
        const activation = await tx.dailyThemeActivation.create({
          data: {
            dateKey,
            dailyThemeId: activated.id,
            source: "ADMIN",
            triggerSource,
            auditMetadata: {
              adminId,
              scheduledForDateKey: dateKey,
            },
          },
        });

        // Write system AuditLog
        await tx.auditLog.create({
          data: {
            action: "scheduled_theme_activated",
            entityType: "DailyTheme",
            entityId: activated.id,
            actorId: adminId,
            metadataJson: {
              dateKey,
              themeText: activated.themeText,
              activationId: activation.id,
              triggerSource,
            },
          },
        });

        return {
          success: true,
          dateKey,
          activatedThemeId: activated.id,
          themeText: activated.themeText,
          source: "ADMIN" as const,
          isNewActivation: true,
        };
      }

      // 5. No admin-scheduled theme exists. Fetch negative prompts context and run AI generator.
      const recentPrompts = await getRecentActiveThemeTexts(90);
      const generated = await generateAIFallbackTheme(dateKey, recentPrompts);

      // Create new DailyTheme row
      const fallbackTheme = await tx.dailyTheme.create({
        data: {
          themeText: generated.prompt, // Prompt text is primary theme identifier
          themeDate: new Date(),
          description: generated.description,
          status: "active",
          source: "AI_FALLBACK",
          generatedByModel: generated.generatedByModel || "local-mock",
          generationPrompt: generated.generationPrompt || "None",
          generationMetadata: generated.tags ? { tags: generated.tags, difficulty: generated.difficulty } : {},
        },
      });

      // Insert Activation record
      const activation = await tx.dailyThemeActivation.create({
        data: {
          dateKey,
          dailyThemeId: fallbackTheme.id,
          source: "AI_FALLBACK",
          triggerSource,
          auditMetadata: {
            generatedByModel: generated.generatedByModel || "local-mock",
          },
        },
      });

      // Write System AuditLog
      await tx.auditLog.create({
        data: {
          action: "ai_fallback_theme_generated",
          entityType: "DailyTheme",
          entityId: fallbackTheme.id,
          actorId: "system",
          metadataJson: {
            dateKey,
            themeText: fallbackTheme.themeText,
            activationId: activation.id,
            generatedByModel: fallbackTheme.generatedByModel,
            triggerSource,
          },
        },
      });

      return {
        success: true,
        dateKey,
        activatedThemeId: fallbackTheme.id,
        themeText: fallbackTheme.themeText,
        source: "AI_FALLBACK" as const,
        isNewActivation: true,
      };
    });

    return result;
  } catch (error: any) {
    console.error(`[Daily-Theme-Rotation] Core activation transaction failed for key ${dateKey}:`, error);
    
    // Check if error is due to a unique index violation (P2002) - concurrent activation fallback
    if (error.code === "P2002") {
      const concurrentRecord = await prisma.dailyThemeActivation.findUnique({
        where: { dateKey },
        include: { dailyTheme: true },
      });
      if (concurrentRecord) {
        return {
          success: true,
          dateKey,
          activatedThemeId: concurrentRecord.dailyThemeId,
          themeText: concurrentRecord.dailyTheme.themeText,
          source: concurrentRecord.source as "ADMIN" | "AI_FALLBACK",
          isNewActivation: false,
        };
      }
    }

    return {
      success: false,
      dateKey,
      activatedThemeId: null,
      themeText: null,
      source: "AI_FALLBACK",
      isNewActivation: false,
      error: error instanceof Error ? error.message : "Prisma transaction database conflict.",
    };
  }
}
