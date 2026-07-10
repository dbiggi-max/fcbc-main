"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateImage } from "@/lib/inference/mock-inference";

export interface GenerateImagePayload {
  artistId: string;
  modelAdapterId: string;
  prompt: string;
  negativePrompt?: string | null;
  seed?: number | null;
  steps: number;
  guidanceScale: number;
}

/**
 * Server Action to execute the complete image generation loop:
 * 1. Validates prompt and parameters.
 * 2. Verifies selected Artist and Model Adapter relational mappings.
 * 3. Creates a GenerationRequest row in 'queued' status.
 * 4. Logs a 'generation_requested' audit log.
 * 5. Dispatches request to the mock inference connector.
 * 6. On success:
 *    - Updates GenerationRequest to 'completed' with output path, seed, etc.
 *    - Creates a simulated JPY 50 RoyaltyEvent row.
 *    - Logs 'generation_completed' and 'royalty_event_created' audit logs.
 * 7. On failure:
 *    - Updates GenerationRequest to 'failed' with error message.
 *    - Logs 'generation_failed' audit log.
 * 8. Triggers page cache revalidation.
 */
export async function generateStyleImage(payload: GenerateImagePayload) {
  const artistId = payload.artistId;
  const modelAdapterId = payload.modelAdapterId;
  const prompt = payload.prompt ? payload.prompt.trim() : "";
  const negativePrompt = payload.negativePrompt ? payload.negativePrompt.trim() : null;
  const steps = Number(payload.steps);
  const guidanceScale = Number(payload.guidanceScale);
  const seed = payload.seed !== undefined && payload.seed !== null ? Number(payload.seed) : null;

  // 1. Validation Rules
  if (!artistId) {
    return { success: false, error: "Artist style selection is required." };
  }
  if (!modelAdapterId) {
    return { success: false, error: "Model adapter selection is required." };
  }
  if (!prompt) {
    return { success: false, error: "Prompt is required." };
  }
  if (prompt.length < 3) {
    return { success: false, error: "Prompt must be at least 3 characters long." };
  }
  if (isNaN(steps) || steps < 1 || steps > 100) {
    return { success: false, error: "Steps must be a valid integer between 1 and 100." };
  }
  if (isNaN(guidanceScale) || guidanceScale < 1 || guidanceScale > 20) {
    return { success: false, error: "Guidance scale must be a valid number between 1.0 and 20.0." };
  }
  if (seed !== null && (isNaN(seed) || !Number.isInteger(seed))) {
    return { success: false, error: "Seed must be a valid integer." };
  }

  // 2. Validate existence and fetch parent datasetVersionId
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
  });
  if (!artist) {
    return { success: false, error: "The selected artist style does not exist." };
  }

  const modelAdapter = await prisma.modelAdapter.findUnique({
    where: { id: modelAdapterId },
  });
  if (!modelAdapter) {
    return { success: false, error: "The selected model adapter does not exist." };
  }
  if (modelAdapter.artistId !== artistId) {
    return { success: false, error: "The selected model adapter does not belong to the chosen artist style." };
  }

  const datasetVersionId = modelAdapter.datasetVersionId; // Map related dataset version if available

  // 3. Queue the generation request in database
  let generationRequest;
  try {
    generationRequest = await prisma.generationRequest.create({
      data: {
        artistId,
        modelAdapterId,
        datasetVersionId,
        prompt,
        negativePrompt,
        seed,
        status: "queued",
        parametersJson: {
          steps,
          guidanceScale,
          seed,
        },
      },
    });

    // 4. Log initial audit log
    await prisma.auditLog.create({
      data: {
        action: "generation_requested",
        entityType: "GenerationRequest",
        entityId: generationRequest.id,
        metadataJson: {
          artistId,
          modelAdapterId,
          datasetVersionId,
          prompt,
          parameters: {
            steps,
            guidanceScale,
            seed,
          },
        },
      },
    });
  } catch (dbError) {
    console.error("Database queue failure:", dbError);
    return { success: false, error: "Could not initialize generation request record in database." };
  }

  // 5. Invoke mock inference connector
  try {
    const inferenceResult = await generateImage({
      artistId,
      modelAdapterId,
      prompt,
      negativePrompt,
      seed,
      steps,
      guidanceScale,
    });

    if (!inferenceResult.success) {
      throw new Error(inferenceResult.errorMessage || "Inference connector failed.");
    }

    // 6. Complete Generation & simulate JPY Royalty in a single database execution flow
    const updateResult = await prisma.$transaction(async (tx) => {
      // a. Update GenerationRequest status
      const updatedReq = await tx.generationRequest.update({
        where: { id: generationRequest.id },
        data: {
          status: "completed",
          outputImagePath: inferenceResult.outputImagePath,
          seed: inferenceResult.seed, // Store actual generated seed
          completedAt: new Date(),
        },
        include: {
          artist: true,
          modelAdapter: true,
          datasetVersion: true,
        },
      });

      // b. Credit 50 JPY simulated royalty to the artist
      const royalty = await tx.royaltyEvent.create({
        data: {
          generationRequestId: updatedReq.id,
          artistId: updatedReq.artistId,
          amountCents: 50, // JPY amount
          currency: "JPY",
          status: "simulated",
        },
      });

      // c. Create audits inside transaction context
      await tx.auditLog.create({
        data: {
          action: "generation_completed",
          entityType: "GenerationRequest",
          entityId: updatedReq.id,
          metadataJson: {
            artistId,
            modelAdapterId,
            datasetVersionId,
            prompt,
            outputImagePath: inferenceResult.outputImagePath,
            seed: inferenceResult.seed,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "royalty_event_created",
          entityType: "RoyaltyEvent",
          entityId: royalty.id,
          metadataJson: {
            artistId,
            generationRequestId: updatedReq.id,
            amountCents: 50,
            currency: "JPY",
          },
        },
      });

      return { request: updatedReq, royalty };
    });

    // Revalidate paths to refresh telemetry counts and admin list tables instantly
    revalidatePath("/generate");
    revalidatePath("/admin/generations");
    revalidatePath("/admin/royalties");
    revalidatePath("/admin");

    return {
      success: true,
      generation: updateResult.request,
      royalty: updateResult.royalty,
    };
  } catch (error) {
    console.error("Inference execution failure:", error);
    const errorMsg = error instanceof Error ? error.message : "Inference engine timeout.";

    // Mark request as failed
    try {
      const failedReq = await prisma.generationRequest.update({
        where: { id: generationRequest.id },
        data: {
          status: "failed",
          errorMessage: errorMsg,
          completedAt: new Date(),
        },
        include: {
          artist: true,
          modelAdapter: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "generation_failed",
          entityType: "GenerationRequest",
          entityId: generationRequest.id,
          metadataJson: {
            artistId,
            modelAdapterId,
            prompt,
            error: errorMsg,
          },
        },
      });

      revalidatePath("/generate");
      revalidatePath("/admin/generations");
      revalidatePath("/admin");

      return {
        success: false,
        error: errorMsg,
        generation: failedReq,
      };
    } catch (saveError) {
      console.error("Failed to write failure status to database:", saveError);
      return { success: false, error: `Inference failed (${errorMsg}), and status could not be saved.` };
    }
  }
}
