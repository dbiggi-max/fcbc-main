export interface GenerateImageInput {
  artistId: string;
  modelAdapterId: string;
  prompt: string;
  negativePrompt?: string | null;
  seed?: number | null;
  steps?: number | null;
  guidanceScale?: number | null;
  parameters?: Record<string, unknown> | null;
}

export interface GenerateImageResult {
  success: boolean;
  outputImagePath: string;
  seed: number;
  width: number;
  height: number;
  provider: string;
  errorMessage?: string | null;
}
