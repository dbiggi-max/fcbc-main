"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Server Action to manually complete a generation request using FormData.
 * Supports either direct image file upload or manual fallback path inputs.
 */
export async function manuallyCompleteGeneration(formData: FormData) {
  try {
    const generationRequestId = formData.get("generationRequestId") as string;
    const outputImagePathFallback = formData.get("outputImagePath") as string | null;
    const seedStr = formData.get("seed") as string | null;
    const parametersJson = formData.get("parametersJson") as string | null;
    const adminNote = formData.get("adminNote") as string | null;
    
    // File upload
    const imageFile = formData.get("imageFile") as File | null;
    const hasUploadedFile = imageFile && imageFile.size > 0 && imageFile.name !== "";

    if (!generationRequestId) {
      return { success: false, error: "Generation request ID is required." };
    }

    let finalOutputImagePath = "";
    let saveResult: { relativePath: string; originalFilename: string; size: number; mimeType: string } | null = null;

    if (hasUploadedFile) {
      const { validateImageFile, saveUploadedImage } = await import("@/lib/storage/local-storage");
      const validation = validateImageFile(imageFile);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Save to public/uploads/generated-results
      saveResult = await saveUploadedImage(imageFile, "generated-results");
      finalOutputImagePath = saveResult.relativePath;
    } else if (outputImagePathFallback && outputImagePathFallback.trim() !== "") {
      finalOutputImagePath = outputImagePathFallback.trim();
    } else {
      return { success: false, error: "Either an uploaded image file or a fallback image path is required." };
    }

    // 1. Fetch generation request to verify existence and gather relationships
    const generationRequest = await prisma.generationRequest.findUnique({
      where: { id: generationRequestId },
      include: {
        artist: true,
        modelAdapter: true,
        datasetVersion: true,
      },
    });

    if (!generationRequest) {
      return { success: false, error: `Generation request with ID "${generationRequestId}" not found.` };
    }

    // 2. Parse final parameters JSON
    let parsedParams: Record<string, any> = {};
    if (parametersJson && parametersJson.trim() !== "") {
      try {
        parsedParams = JSON.parse(parametersJson);
      } catch (e) {
        return { success: false, error: "Parameters must be valid JSON format." };
      }
    }

    const seed = seedStr && seedStr.trim() !== "" ? Number(seedStr) : generationRequest.seed;

    // Merge parameters
    const existingParams = (generationRequest.parametersJson as Record<string, any>) || {};
    const finalParams = {
      ...existingParams,
      ...parsedParams,
      ...(adminNote ? { adminNote } : {}),
    };

    // 3. Atomic Database Transaction: Update Generation, Create Royalty, and Create Audit logs
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Update generation
      const updatedGen = await tx.generationRequest.update({
        where: { id: generationRequestId },
        data: {
          status: "completed",
          outputImagePath: finalOutputImagePath,
          completedAt: new Date(),
          seed: seed !== null ? seed : null,
          parametersJson: finalParams,
          errorMessage: null,
        },
      });

      // Check for pre-existing royalty event
      const existingRoyalty = await tx.royaltyEvent.findUnique({
        where: { generationRequestId },
      });

      let royaltyEvent = null;
      if (!existingRoyalty) {
        // Create new simulated royalty event (50 JPY cents)
        royaltyEvent = await tx.royaltyEvent.create({
          data: {
            generationRequestId,
            artistId: generationRequest.artistId,
            amountCents: 50,
            currency: "JPY",
            status: "simulated",
          },
        });
      }

      // Compile audit metadata
      const auditMetadata = {
        generationRequestId,
        artistId: generationRequest.artistId,
        modelAdapterId: generationRequest.modelAdapterId,
        datasetVersionId: generationRequest.datasetVersionId,
        outputImagePath: finalOutputImagePath,
        royaltyEventId: royaltyEvent?.id || existingRoyalty?.id || null,
        adminNote: adminNote || null,
      };

      // Log image file upload if performed (Requirement 7)
      if (saveResult) {
        await tx.auditLog.create({
          data: {
            actorId: "admin_manual_completer",
            action: "generated_result_image_uploaded",
            entityType: "GenerationRequest",
            entityId: generationRequestId,
            metadataJson: {
              storedPath: saveResult.relativePath,
              originalFilename: saveResult.originalFilename,
              fileSize: saveResult.size,
              mimeType: saveResult.mimeType,
              generationRequestId,
              artistId: generationRequest.artistId,
            },
          },
        });
      }

      // Create dual audit logs
      await tx.auditLog.create({
        data: {
          actorId: "admin_manual_completer",
          action: "generation_manually_completed",
          entityType: "generation_request",
          entityId: generationRequestId,
          metadataJson: auditMetadata,
        },
      });

      if (royaltyEvent) {
        await tx.auditLog.create({
          data: {
            actorId: "admin_manual_completer",
            action: "royalty_event_created",
            entityType: "royalty_event",
            entityId: royaltyEvent.id,
            metadataJson: auditMetadata,
          },
        });
      }

      return {
        royaltyCreated: !!royaltyEvent,
        royaltyEventId: royaltyEvent?.id || existingRoyalty?.id || null,
      };
    });

    // 7. Revalidate all dependent routes
    revalidatePath("/admin/generations");
    revalidatePath("/gallery");
    revalidatePath("/admin/royalties");
    revalidatePath("/admin");

    return {
      success: true,
      royaltyCreated: transactionResult.royaltyCreated,
      royaltyEventId: transactionResult.royaltyEventId,
    };

  } catch (error) {
    console.error("❌ Failed manually completing generation request:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal database operation failure.",
    };
  }
}
