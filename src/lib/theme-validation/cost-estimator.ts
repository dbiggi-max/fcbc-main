/**
 * Cost Estimator Utility for Google Vertex AI Gemini validation API calls.
 */

export interface CostEstimationResult {
  submissionCount: number;
  expectedRequests: number;
  providerName: string;
  modelName: string;
  estimatedCostUsd: number;
  costWarningRequired: boolean;
  warningMessage: string | null;
}

const COST_PER_REQUEST_USD = 0.00015; // ~$0.00015 per call for Gemini Flash models including multimodal image payloads

/**
 * Calculates the cost bounds and determines if a warnings banner is required.
 */
export function estimateRevalidationCost(
  selectedCount: number,
  provider: string = "google_gemini",
  model: string = "gemini-2.5-flash"
): CostEstimationResult {
  const isMock = provider.toLowerCase() === "mock";
  const expectedRequests = isMock ? 0 : selectedCount;
  const estimatedCostUsd = isMock ? 0.0 : expectedRequests * COST_PER_REQUEST_USD;

  // We show a warning if cost is significant or count > 50 images in a single batch
  const costWarningRequired = !isMock && (expectedRequests > 50 || estimatedCostUsd > 0.01);

  let warningMessage: string | null = null;
  if (costWarningRequired) {
    warningMessage = `⚠️ Proceeding with revalidation will trigger ${expectedRequests} external Google Cloud Vertex AI API requests to model "${model}". Estimated cost is approximately $${estimatedCostUsd.toFixed(5)} USD.`;
  }

  return {
    submissionCount: selectedCount,
    expectedRequests,
    providerName: isMock ? "Mock Simulator" : "Google Cloud Vertex AI",
    modelName: isMock ? "mock-vision-v2" : model,
    estimatedCostUsd,
    costWarningRequired,
    warningMessage,
  };
}
