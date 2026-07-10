"use server";
import { prisma } from "@/lib/prisma";
import { saveUploadedImage, validateImageFile } from "@/lib/storage/local-storage";
import { auth } from "@/lib/auth";


function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;
}

export async function submitThemeSubmission(formData: FormData) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Authentication is required to submit artwork." };
    }
    const finalUserId = session.user.id;

    // 1. Extract inputs from FormData
    const dailyThemeId = formData.get("dailyThemeId") as string;
    const promptOrCaption = formData.get("promptOrCaption") as string | null;
    const artistId = formData.get("artistId") as string | null;
    
    // Fallback URL or path if no file is uploaded
    const imagePathFallback = formData.get("imagePath") as string | null;
    
    // File upload
    const imageFile = formData.get("imageFile") as File | null;

    if (!dailyThemeId) {
      return { success: false, error: "Daily theme identifier is required." };
    }

    let finalImagePath = "";
    let saveResult: { relativePath: string; originalFilename: string; size: number; mimeType: string } | null = null;

    // Check if an actual file was uploaded
    // (Note: in standard HTML form submits, if no file is selected, imageFile can be an empty File object with size 0 or name "")
    const hasUploadedFile = imageFile && imageFile.size > 0 && imageFile.name !== "";

    if (hasUploadedFile) {
      // Validate uploaded image rules
      const validation = validateImageFile(imageFile);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Save to disk under 'daily-theme'
      saveResult = await saveUploadedImage(imageFile, "daily-theme");
      finalImagePath = saveResult.relativePath;
    } else if (imagePathFallback && imagePathFallback.trim() !== "") {
      finalImagePath = imagePathFallback.trim();
    } else {
      return { success: false, error: "Either an uploaded image file or a fallback image path is required." };
    }

    // 2. Database validation checks
    const themeExists = await prisma.dailyTheme.findUnique({
      where: { id: dailyThemeId },
    });
    if (!themeExists) {
      return { success: false, error: "The selected daily theme challenge does not exist." };
    }

    // Optional Artist validation
    let verifiedArtistId: string | null = null;
    if (artistId && artistId !== "none" && artistId !== "undefined") {
      const artistExists = await prisma.artist.findUnique({
        where: { id: artistId },
      });
      if (!artistExists) {
        return { success: false, error: "The selected artist style profile does not exist." };
      }
      verifiedArtistId = artistId;
    }

    const finalPrompt = promptOrCaption && promptOrCaption.trim() !== "" ? promptOrCaption.trim() : null;

    // 3. Create the initial ThemeSubmission record with 'pending' status
    const submission = await prisma.themeSubmission.create({
      data: {
        dailyThemeId,
        imagePath: finalImagePath,
        promptOrCaption: finalPrompt,
        userId: finalUserId,
        artistId: verifiedArtistId,
        validationStatus: "pending",
        effectiveStatus: "pending",
        savedToDataset: false,
        datasetApprovalStatus: "not_approved",
      },
    });

    // Log image file upload if performed
    if (saveResult) {
      await prisma.auditLog.create({
        data: {
          action: "daily_theme_image_uploaded",
          entityType: "ThemeSubmission",
          entityId: submission.id,
          metadataJson: {
            storedPath: saveResult.relativePath,
            originalFilename: saveResult.originalFilename,
            fileSize: saveResult.size,
            mimeType: saveResult.mimeType,
            submissionId: submission.id,
            dailyThemeId,
            userId: finalUserId,
            artistId: verifiedArtistId,
          },
        },
      });
    }

    // Log creation inside system audit log table
    await prisma.auditLog.create({
      data: {
        action: "daily_theme_submission_created",
        entityType: "ThemeSubmission",
        entityId: submission.id,
        metadataJson: {
          dailyThemeId,
          userId: finalUserId,
          artistId: verifiedArtistId,
          imagePath: finalImagePath,
          promptOrCaption: finalPrompt,
        },
      },
    });

    // 4. Trigger our robust Daily Theme Drawing Validation Workflow (Phase 1)
    // If validation fails, this function handles it gracefully internally, creating a fallback failure log
    // and setting status to borderline (NEEDS_REVIEW) in production, or mock validation in development.
    try {
      const { validateThemeSubmissionWorkflow } = await import("@/lib/theme-validation/validate-submission");
      await validateThemeSubmissionWorkflow(submission.id, "INITIAL_SUBMISSION");
    } catch (validationError) {
      console.error("[submitThemeSubmission] Secondary unhandled validation workflow failure:", validationError);
      try {
        await prisma.themeSubmission.update({
          where: { id: submission.id },
          data: {
            validationStatus: "borderline",
            effectiveStatus: "borderline",
            validationExplanation: `Validation pipeline exception: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
          },
        });
      } catch (dbUpdateError) {
        console.error("[submitThemeSubmission] Failed to write emergency fallback database status:", dbUpdateError);
      }
    }

    return {
      success: true,
      submissionId: submission.id,
    };
  } catch (error) {
    console.error("Ingestion Server Action failure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal system runtime exception.",
    };
  }
}

