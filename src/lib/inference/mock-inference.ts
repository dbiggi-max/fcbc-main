import { GenerateImageInput, GenerateImageResult } from "./types";

/**
 * Simulates an image generation request with full GPU model loading,
 * scheduling delay, and inference latency.
 */
export async function generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  // Simulate 1.5 seconds network/GPU processing latency
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Determine seed (either use provided seed or generate a high-quality random one)
  const resolvedSeed =
    typeof input.seed === "number" && !isNaN(input.seed)
      ? input.seed
      : Math.floor(Math.random() * 999999999);

  return {
    success: true,
    outputImagePath: "/placeholder-generated-image.png",
    seed: resolvedSeed,
    width: 1024,
    height: 1024,
    provider: "mock",
  };
}
