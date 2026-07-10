import { ThemeValidationProvider, ThemeValidationScores } from "./types";

/**
 * Mock theme validation provider that simulates a multimodal Gemini model
 * response deterministically based on text patterns inside the file name or active theme.
 */
export class MockThemeValidationProvider implements ThemeValidationProvider {
  async validate(
    imagePath: string,
    themeText: string,
    themeDescription: string | null
  ): Promise<ThemeValidationScores & { rawResponseJson: any; rawResponseId?: string | null }> {
    console.info(`[MockThemeValidationProvider] Simulating Gemini evaluation for ${imagePath} against theme "${themeText}"...`);

    // Add a small artificial sleep to feel realistic
    await new Promise((resolve) => setTimeout(resolve, 300));

    const pathLower = imagePath.toLowerCase();
    const themeLower = themeText.toLowerCase();

    // Baseline standard drawing scores (passes easily)
    let scores: ThemeValidationScores = {
      themeMatchScore: 85,
      qualityScore: 75,
      simplicityScore: 35,
      effortScore: 70,
      spamScore: 10,
    };

    if (pathLower.includes("spam") || themeLower.includes("spam")) {
      scores = {
        themeMatchScore: 15,
        qualityScore: 10,
        simplicityScore: 90,
        effortScore: 5,
        spamScore: 95,
      };
    } else if (pathLower.includes("unrelated") || pathLower.includes("wrong") || themeLower.includes("unrelated")) {
      scores = {
        themeMatchScore: 25,
        qualityScore: 65,
        simplicityScore: 30,
        effortScore: 60,
        spamScore: 15,
      };
    } else if (pathLower.includes("simple") || pathLower.includes("low_effort") || pathLower.includes("empty")) {
      scores = {
        themeMatchScore: 80,
        qualityScore: 30,
        simplicityScore: 85,
        effortScore: 20,
        spamScore: 10,
      };
    } else if (pathLower.includes("borderline") || pathLower.includes("ambiguous") || themeLower.includes("borderline")) {
      // Falls into NEEDS_REVIEW
      scores = {
        themeMatchScore: 72, // slightly below minThemeMatch (75)
        qualityScore: 65,
        simplicityScore: 40,
        effortScore: 60,
        spamScore: 15,
      };
    }

    const mockResponseJson = {
      themeMatchScore: scores.themeMatchScore,
      qualityScore: scores.qualityScore,
      simplicityScore: scores.simplicityScore,
      effortScore: scores.effortScore,
      spamScore: scores.spamScore,
      reasoning: `Simulated Gemini analysis: Evaluated the image at ${imagePath} against theme "${themeText}". Detected compatible styling matching standard drawing challenges.`,
    };

    return {
      ...scores,
      rawResponseJson: mockResponseJson,
      rawResponseId: `mock-response-id-${Math.random().toString(36).substring(7)}`,
    };
  }
}
