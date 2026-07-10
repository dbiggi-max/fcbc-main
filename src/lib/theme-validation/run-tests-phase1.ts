import { applyThresholds } from "./thresholds";
import { MockThemeValidationProvider } from "./mock-validator";
import { estimateRevalidationCost } from "./cost-estimator";
import { ThemeValidationScores } from "./types";

async function runTestGroup(name: string, testFn: () => Promise<void> | void) {
  console.log(`\n=== Running Test Group: ${name} ===`);
  try {
    await testFn();
    console.log(`✅ [PASSED] Test Group: ${name}`);
  } catch (error) {
    console.error(`❌ [FAILED] Test Group: ${name}`);
    console.error(error);
    process.exit(1);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function startTestSuite() {
  // 1. Test Threshold Solver Boundaries
  await runTestGroup("Threshold Solver Boundaries", () => {
    // Test case 1: Perfect APPROVED scores
    const approvedScores: ThemeValidationScores = {
      themeMatchScore: 90,
      qualityScore: 80,
      simplicityScore: 20,
      effortScore: 85,
      spamScore: 5,
    };
    const decision1 = applyThresholds(approvedScores);
    assert(decision1.decision === "APPROVED", "Perfect scores should be APPROVED");
    assert(decision1.rejectionCodes.length === 0, "Approved should have no rejection codes");

    // Test case 2: Borderline (NEEDS_REVIEW)
    const borderlineScores: ThemeValidationScores = {
      themeMatchScore: 70, // Below minThemeMatch (75) but within buffer
      qualityScore: 80,
      simplicityScore: 20,
      effortScore: 85,
      spamScore: 5,
    };
    const decision2 = applyThresholds(borderlineScores);
    assert(decision2.decision === "NEEDS_REVIEW", "Scores close to boundaries should require manual NEEDS_REVIEW");
    assert(decision2.rejectionCodes.includes("OFF_THEME"), "Rejection should report OFF_THEME");

    // Test case 3: Obvious SPAM
    const spamScores: ThemeValidationScores = {
      themeMatchScore: 90,
      qualityScore: 80,
      simplicityScore: 20,
      effortScore: 85,
      spamScore: 60, // Above maxSpam (30)
    };
    const decision3 = applyThresholds(spamScores);
    assert(decision3.decision === "SPAM", "High spam scores must trigger SPAM status");
    assert(decision3.rejectionCodes.includes("OBVIOUS_SPAM"), "Rejection should report OBVIOUS_SPAM");

    // Test case 4: Completely Rejected
    const rejectedScores: ThemeValidationScores = {
      themeMatchScore: 40, // Far below threshold (75)
      qualityScore: 30,
      simplicityScore: 80,
      effortScore: 10,
      spamScore: 5,
    };
    const decision4 = applyThresholds(rejectedScores);
    assert(decision4.decision === "REJECTED", "Scores far below boundaries must trigger flat REJECTED decision");
    assert(decision4.rejectionCodes.includes("OFF_THEME"), "Rejection should report OFF_THEME");
    assert(decision4.rejectionCodes.includes("LOW_QUALITY"), "Rejection should report LOW_QUALITY");
    assert(decision4.rejectionCodes.includes("LOW_EFFORT"), "Rejection should report LOW_EFFORT");
  });

  // 2. Test Mock Provider Simulator
  await runTestGroup("Mock Provider Simulator", async () => {
    const provider = new MockThemeValidationProvider();

    // Test custom mock behavior on specific keyword filenames
    const resSpam = await provider.validate("some_path/obvious_spam_drawing.png", "A cat on a mat", "A furry cat");
    assert(resSpam.spamScore === 95, "Spam filename should return high spam score");

    // Test default mock behavior
    const resDefault = await provider.validate("some_path/normal_art.png", "Sunlight", "Warm sun rays");
    assert(resDefault.themeMatchScore === 85, "Default validation should yield baseline themeMatchScore of 85");
    assert(resDefault.effortScore === 70, "Default validation should yield baseline effortScore of 70");
    assert(typeof resDefault.rawResponseId === "string", "Raw response id must be defined");
    assert(resDefault.rawResponseJson.reasoning !== undefined, "Raw response must contain reasoning text");
  });


  // 3. Test Cost Estimator Calculations
  await runTestGroup("Cost Estimator Math & Warning Thresholds", () => {
    // Mock provider estimate
    const estMock = estimateRevalidationCost(10, "mock");
    assert(estMock.expectedRequests === 0, "Mock provider should result in 0 expected requests");
    assert(estMock.estimatedCostUsd === 0.0, "Mock provider cost must be exactly $0 USD");
    assert(!estMock.costWarningRequired, "Mock provider must never trigger a cost warning");

    // Single Vertex AI request
    const estSingle = estimateRevalidationCost(1, "google_gemini", "gemini-2.5-flash");
    assert(estSingle.expectedRequests === 1, "Expected requests should match selected count for GCP");
    assert(estSingle.estimatedCostUsd === 0.00015, "Single call cost must be exactly $0.00015 USD");
    assert(!estSingle.costWarningRequired, "Single call should not trigger pre-flight warning");

    // Large batch (60 items) triggering warnings
    const estBatch = estimateRevalidationCost(60, "google_gemini", "gemini-2.5-flash");
    assert(estBatch.expectedRequests === 60, "Requests must scale with selected count");
    assert(estBatch.estimatedCostUsd === 0.009, "Cost should equal requests * $0.00015");
    assert(estBatch.costWarningRequired, "Batch of 60 should trigger cost warnings");
    assert(estBatch.warningMessage !== null, "Warning message must be non-null");
    assert(estBatch.warningMessage!.includes("60 external Google Cloud Vertex AI API requests"), "Warning must report correct request count");
  });

  console.log("\n🚀 All Phase 1 Drawing Validation Suite Tests Passed Successfully!\n");
}

startTestSuite();
