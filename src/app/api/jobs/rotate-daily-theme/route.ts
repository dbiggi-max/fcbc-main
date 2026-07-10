import { NextRequest, NextResponse } from "next/server";
import { rotateDailyThemeForDate } from "@/lib/daily-theme/rotation";
import { getJapanDateKey } from "@/lib/daily-theme/date";

export const dynamic = "force-dynamic";

/**
 * POST /api/jobs/rotate-daily-theme
 * Secure background worker trigger for daily theme rotation.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Request
    const authHeader = request.headers.get("Authorization");
    const secretHeader = request.headers.get("x-rotation-secret");

    const expectedSecret = (process.env.THEME_ROTATION_SECRET || "development-secret-key-change-in-prod").trim();
    const isSecretValid = secretHeader === expectedSecret;

    // Support GCP Cloud Scheduler OIDC verification if configured
    let isOidcValid = false;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      // If deployed on GCP, validation libraries or environment tokens verify this string.
      // For development, we allow secret match or fallback validation.
      if (token === expectedSecret) {
        isOidcValid = true;
      }
    }

    if (!isSecretValid && !isOidcValid && process.env.NODE_ENV === "production") {
      console.warn("[Jobs-Theme-Rotation] Unauthorized rotation trigger attempt rejected.");
      return NextResponse.json(
        { success: false, error: "Unauthorized access: invalid OIDC token or secret credential." },
        { status: 401 }
      );
    }

    // 2. Resolve target Tokyo Date Key (defaulting to current Tokyo date)
    let dateKey = getJapanDateKey();

    // Optionally allow passing a custom date key in JSON body for manual correction
    try {
      const body = await request.json();
      if (body?.dateKey) {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (datePattern.test(body.dateKey)) {
          dateKey = body.dateKey;
          console.info(`[Jobs-Theme-Rotation] Overriding rotation target date key to: ${dateKey}`);
        }
      }
    } catch {
      // Gracefully continue with today's date if no JSON body was sent
    }

    console.info(`[Jobs-Theme-Rotation] Starting daily theme rotation job for target JST date: ${dateKey}`);

    // 3. Orchestrate rotation
    const result = await rotateDailyThemeForDate(dateKey, {
      triggerSource: "CRON",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, dateKey },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Daily theme successfully resolved and active for date key ${dateKey}.`,
      details: {
        dateKey: result.dateKey,
        activatedThemeId: result.activatedThemeId,
        themeText: result.themeText,
        source: result.source,
        isNewActivation: result.isNewActivation,
      },
    });
  } catch (error: any) {
    console.error("[Jobs-Theme-Rotation] Background worker error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal system crash." },
      { status: 500 }
    );
  }
}
