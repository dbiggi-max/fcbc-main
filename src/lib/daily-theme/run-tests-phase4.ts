import { prisma } from "../prisma";
import { getJapanDateKey, getSecondsUntilJapanMidnight } from "./date";
import { rotateDailyThemeForDate } from "./rotation";

async function runTests() {
  console.info("=================================================");
  console.info("🚀 STARTING AUTOMATED UNIT TESTS: PHASE 4 DAILY THEMES");
  console.info("=================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.info(`  ✔ PASSED: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${msg}`);
      failed++;
    }
  }

  try {
    // Test 1: Date calculations
    console.info("\n[Test Group 1] Timezone & JST Date Calculators");
    const todayKey = getJapanDateKey();
    assert(/^\d{4}-\d{2}-\d{2}$/.test(todayKey), `getJapanDateKey returns valid JST YYYY-MM-DD: "${todayKey}"`);

    const secondsLeft = getSecondsUntilJapanMidnight();
    assert(secondsLeft >= 0 && secondsLeft <= 86400, `getSecondsUntilJapanMidnight computes correct JST clock bound: ${secondsLeft}s left`);


    // Test 2: Idempotent double rotations and scheduled vs generated themes
    console.info("\n[Test Group 2] Idempotency & Database Orchestrations");

    const testDateKey = "2029-10-15"; // Safe distant future date to prevent collision with real challenges

    // Clean up any old test garbage before running
    await prisma.dailyThemeActivation.deleteMany({ where: { dateKey: testDateKey } });
    await prisma.dailyTheme.deleteMany({ where: { scheduledForDateKey: testDateKey } });

    // Step A: Seed an admin-scheduled theme for testDateKey
    const adminTheme = await prisma.dailyTheme.create({
      data: {
        themeText: "Test Mechanical Robot Outlines",
        themeDate: new Date(),
        description: "Draw a vintage steel mechanical robot.",
        status: "SCHEDULED",
        source: "ADMIN",
        scheduledForDateKey: testDateKey,
      },
    });

    // Step B: Trigger rotation for testDateKey first time (should find the admin scheduled theme)
    const run1 = await rotateDailyThemeForDate(testDateKey, {
      triggerSource: "MANUAL",
      adminId: "test-runner",
    });

    assert(run1.success === true, "rotateDailyThemeForDate successfully triggered first run");
    assert(run1.activatedThemeId === adminTheme.id, "Correctly selected the admin-scheduled daily theme");
    assert(run1.source === "ADMIN", "Theme source resolves to 'ADMIN'");
    assert(run1.isNewActivation === true, "Marks isNewActivation as true on initial run");

    // Step C: Trigger rotation for testDateKey a second time (should hit primary cache / idempotency guard)
    const run2 = await rotateDailyThemeForDate(testDateKey, {
      triggerSource: "MANUAL",
    });

    assert(run2.success === true, "rotateDailyThemeForDate successfully triggered second run");
    assert(run2.activatedThemeId === adminTheme.id, "Second run returns same theme ID");
    assert(run2.isNewActivation === false, "Properly triggers idempotency and returns isNewActivation as false");


    // Test 3: Fallback AI / Mock generator
    console.info("\n[Test Group 3] AI Fallback Prompt Generators");

    const fallbackDateKey = "2029-10-16";
    await prisma.dailyThemeActivation.deleteMany({ where: { dateKey: fallbackDateKey } });

    // Trigger rotation for a date with NO admin theme (should invoke generative mock fallback)
    const fallbackRun = await rotateDailyThemeForDate(fallbackDateKey, {
      triggerSource: "CRON",
    });

    assert(fallbackRun.success === true, "Mock fallback generation executed successfully");
    assert(fallbackRun.source === "AI_FALLBACK", "Fallback theme correctly registers as 'AI_FALLBACK' source");
    assert(fallbackRun.themeText !== null && fallbackRun.themeText.length > 0, `Generated challenge topic successfully: "${fallbackRun.themeText}"`);


    // Cleanup test records to keep database clean
    console.info("\n[Test Group 4] Cleanup Database...");
    await prisma.dailyThemeActivation.deleteMany({ where: { dateKey: { in: [testDateKey, fallbackDateKey] } } });
    await prisma.dailyTheme.deleteMany({ where: { scheduledForDateKey: { in: [testDateKey, fallbackDateKey] } } });
    await prisma.dailyTheme.deleteMany({ where: { source: "AI_FALLBACK", themeText: fallbackRun.themeText || "" } });
    assert(true, "Database pristine cleanup done.");

  } catch (err: any) {
    console.error("Test executing crashed with critical error:", err);
    failed++;
  }

  console.info("\n=================================================");
  console.info(`🏁 TEST EXECUTION RESULT SUMMARY:`);
  console.info(`   PASSED: ${passed}`);
  console.info(`   FAILED: ${failed}`);
  console.info("=================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run the script directly
runTests();
