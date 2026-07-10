"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface RegisterModelAdapterInput {
  artistId: string;
  datasetVersionId?: string | null;
  adapterName: string;
  baseModel: string;
  adapterType: string;
  filePath?: string | null;
  triggerToken?: string | null;
  status: string;
  trainingNotebookUrl?: string | null;
}

/**
 * Server action to register a new ModelAdapter in the database with strict referential validation,
 * case-insensitive duplicate prevention, audit logging, and page revalidation.
 */
export async function registerModelAdapter(input: RegisterModelAdapterInput) {
  try {
    const artistId = input.artistId;
    const datasetVersionId = input.datasetVersionId || null;
    const adapterName = input.adapterName ? input.adapterName.trim() : "";
    const baseModel = input.baseModel ? input.baseModel.trim() : "";
    const adapterType = input.adapterType ? input.adapterType.trim() : "";

    // 1. Core validations
    if (!artistId) {
      return { success: false, error: "Artist selection is required." };
    }
    if (!adapterName) {
      return { success: false, error: "Adapter name is required." };
    }
    if (!baseModel) {
      return { success: false, error: "Base model is required." };
    }
    if (!adapterType) {
      return { success: false, error: "Adapter type is required." };
    }

    // 2. Validate artist exists
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
    });
    if (!artist) {
      return { success: false, error: "The selected artist does not exist." };
    }

    // 3. Validate dataset version belongs to the selected artist (if provided)
    if (datasetVersionId) {
      const datasetVersion = await prisma.datasetVersion.findUnique({
        where: { id: datasetVersionId },
      });
      if (!datasetVersion) {
        return { success: false, error: "The selected dataset version does not exist." };
      }
      if (datasetVersion.artistId !== artistId) {
        return {
          success: false,
          error: "The selected dataset version does not belong to the selected artist.",
        };
      }
    }

    // 4. Case-insensitive duplicate check for adapter names belonging to the same artist
    const duplicate = await prisma.modelAdapter.findFirst({
      where: {
        artistId,
        adapterName: {
          equals: adapterName,
          mode: "insensitive",
        },
      },
    });
    if (duplicate) {
      return {
        success: false,
        error: `A model adapter named "${adapterName}" is already registered for this artist.`,
      };
    }

    // 5. Create ModelAdapter record
    const adapter = await prisma.modelAdapter.create({
      data: {
        artistId,
        datasetVersionId,
        adapterName,
        baseModel,
        adapterType,
        filePath: input.filePath && input.filePath.trim() !== "" ? input.filePath.trim() : null,
        triggerToken: input.triggerToken && input.triggerToken.trim() !== "" ? input.triggerToken.trim() : null,
        status: input.status || "registered",
        trainingNotebookUrl: input.trainingNotebookUrl && input.trainingNotebookUrl.trim() !== "" ? input.trainingNotebookUrl.trim() : null,
      },
    });

    // 6. Write AuditLog
    await prisma.auditLog.create({
      data: {
        action: "model_adapter_registered",
        entityType: "ModelAdapter",
        entityId: adapter.id,
        metadataJson: {
          artistId,
          datasetVersionId,
          adapterName: adapter.adapterName,
          baseModel: adapter.baseModel,
          adapterType: adapter.adapterType,
          filePath: adapter.filePath,
          triggerToken: adapter.triggerToken,
          status: adapter.status,
        },
      },
    });

    // 7. Revalidate relevant routes
    revalidatePath("/admin/adapters");
    revalidatePath("/admin");

    return { success: true, adapterId: adapter.id };
  } catch (error) {
    console.error("Failed to register model adapter server-side:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred during adapter registration.",
    };
  }
}
