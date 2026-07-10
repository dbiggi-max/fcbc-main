"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sizeOf from "image-size";

export interface RegisterImageInput {
  artistId: string;
  datasetVersionId: string;
  licenseRecordId?: string | null;
  filename: string;
  storagePath: string;
  sourceUrl?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  sha256Hash?: string | null;
  qualityStatus: string;
}

/**
 * Retrieves all dataset versions associated with a specific artist.
 */
export async function getDatasetVersionsByArtist(artistId: string) {
  if (!artistId) return [];
  return prisma.datasetVersion.findMany({
    where: { artistId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves all license/consent records associated with a specific artist.
 */
export async function getLicenseRecordsByArtist(artistId: string) {
  if (!artistId) return [];
  return prisma.consentOrLicenseRecord.findMany({
    where: { artistId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Recalculates the image count for a given dataset version and updates the record.
 */
export async function recalculateDatasetImageCount(datasetVersionId: string) {
  if (!datasetVersionId) return 0;
  
  const count = await prisma.datasetImage.count({
    where: { datasetVersionId },
  });

  await prisma.datasetVersion.update({
    where: { id: datasetVersionId },
    data: { imageCount: count },
  });

  return count;
}

/**
 * Server action to securely register a new DatasetImage on the server,
 * perform referential integrity and belonging checks, recalculate counts,
 * and create an audit log.
 */
/**
 * Server action to securely register a new DatasetImage on the server,
 * supporting either direct image file upload or manual fallback path inputs.
 * Performs referential integrity, auto-computes attributes of files, and
 * executes audit/dataset updates transactionally.
 */
export async function registerDatasetImage(formData: FormData) {
  try {
    const artistId = formData.get("artistId") as string;
    const datasetVersionId = formData.get("datasetVersionId") as string;
    const licenseRecordId = (formData.get("licenseRecordId") as string) || null;
    const sourceUrl = formData.get("sourceUrl") as string | null;
    const caption = formData.get("caption") as string | null;
    const widthStr = formData.get("width") as string | null;
    const heightStr = formData.get("height") as string | null;
    const sha256HashInput = formData.get("sha256Hash") as string | null;
    const qualityStatus = (formData.get("qualityStatus") as string) || "pending";
    
    // File upload
    const imageFile = formData.get("imageFile") as File | null;
    const hasUploadedFile = imageFile && imageFile.size > 0 && imageFile.name !== "";

    // Manual inputs as fallbacks
    const filenameInput = formData.get("filename") as string | null;
    const storagePathInput = formData.get("storagePath") as string | null;

    if (!artistId) {
      return { success: false, error: "Artist selection is required." };
    }
    if (!datasetVersionId) {
      return { success: false, error: "Dataset version selection is required." };
    }

    let finalFilename = "";
    let finalStoragePath = "";
    let finalWidth: number | null = widthStr && widthStr.trim() !== "" ? parseInt(widthStr, 10) : null;
    let finalHeight: number | null = heightStr && heightStr.trim() !== "" ? parseInt(heightStr, 10) : null;
    let finalSha256Hash = sha256HashInput && sha256HashInput.trim() !== "" ? sha256HashInput.trim() : null;

    let saveResult: { relativePath: string; originalFilename: string; size: number; mimeType: string; absolutePath: string } | null = null;

    // Check if image file was uploaded
    if (hasUploadedFile) {
      const { validateImageFile, saveUploadedImage } = await import("@/lib/storage/local-storage");
      const validation = validateImageFile(imageFile);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Save to public/uploads/dataset-images
      saveResult = await saveUploadedImage(imageFile, "dataset-images") as any;
      if (!saveResult) {
        return { success: false, error: "Failed to save dataset image to disk." };
      }

      finalFilename = saveResult.originalFilename;
      finalStoragePath = saveResult.relativePath;

      // Extract metadata
      try {
        const buffer = fs.readFileSync(saveResult.absolutePath);
        finalSha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");
        const dimensions = sizeOf(buffer);
        if (dimensions.width) finalWidth = dimensions.width;
        if (dimensions.height) finalHeight = dimensions.height;
      } catch (err) {
        console.warn("Could not compute automatic metadata of file:", err);
      }
    } else {
      // Manual path fallbacks
      if (!filenameInput || filenameInput.trim() === "") {
        return { success: false, error: "Filename is required when not uploading a file." };
      }
      if (!storagePathInput || storagePathInput.trim() === "") {
        return { success: false, error: "Storage path is required when not uploading a file." };
      }
      finalFilename = filenameInput.trim();
      finalStoragePath = storagePathInput.trim();
    }

    // Validate dataset version existence and ensure it belongs to the selected artist
    const datasetVersion = await prisma.datasetVersion.findUnique({
      where: { id: datasetVersionId },
    });
    if (!datasetVersion) {
      return { success: false, error: "The selected dataset version does not exist." };
    }
    if (datasetVersion.artistId !== artistId) {
      return { success: false, error: "The selected dataset version does not belong to the selected artist." };
    }

    // Validate license record existence and ensure it belongs to the selected artist
    if (licenseRecordId && licenseRecordId !== "none" && licenseRecordId !== "") {
      const licenseRecord = await prisma.consentOrLicenseRecord.findUnique({
        where: { id: licenseRecordId },
      });
      if (!licenseRecord) {
        return { success: false, error: "The selected license record does not exist." };
      }
      if (licenseRecord.artistId !== artistId) {
        return { success: false, error: "The selected license record does not belong to the selected artist." };
      }
    }

    // Create the DatasetImage record inside transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdImage = await tx.datasetImage.create({
        data: {
          artistId,
          datasetVersionId,
          licenseRecordId: licenseRecordId && licenseRecordId !== "none" && licenseRecordId !== "" ? licenseRecordId : null,
          filename: finalFilename,
          storagePath: finalStoragePath,
          sourceUrl: sourceUrl && sourceUrl.trim() !== "" ? sourceUrl.trim() : null,
          caption: caption && caption.trim() !== "" ? caption.trim() : null,
          width: finalWidth,
          height: finalHeight,
          sha256Hash: finalSha256Hash,
          qualityStatus: qualityStatus || "pending",
        },
      });

      // Log image file upload if performed (Requirement 7)
      if (saveResult) {
        await tx.auditLog.create({
          data: {
            action: "dataset_image_file_uploaded",
            entityType: "DatasetImage",
            entityId: createdImage.id,
            metadataJson: {
              storedPath: saveResult.relativePath,
              originalFilename: saveResult.originalFilename,
              fileSize: saveResult.size,
              mimeType: saveResult.mimeType,
              datasetImageId: createdImage.id,
              datasetVersionId,
              artistId,
            },
          },
        });
      }

      // Create main audit log
      await tx.auditLog.create({
        data: {
          action: "dataset_image_registered",
          entityType: "DatasetImage",
          entityId: createdImage.id,
          metadataJson: {
            artistId,
            datasetVersionId,
            filename: createdImage.filename,
            sourceUrl: createdImage.sourceUrl,
            storagePath: createdImage.storagePath,
          },
        },
      });

      return createdImage;
    });

    // 5. Update related DatasetVersion imageCount
    await recalculateDatasetImageCount(datasetVersionId);

    // 7. Revalidate datasets route so server UI gets updated
    revalidatePath("/admin/datasets");

    return { success: true, imageId: result.id };
  } catch (error) {
    console.error("Failed to register dataset image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred during image registration.",
    };
  }
}

/**
 * Server action to securely upload and catalog one or more dataset images,
 * write them to the local public folder, extract hashes/dimensions, and
 * log administrative actions.
 */
export async function uploadDatasetImages(formData: FormData) {
  try {
    const artistId = formData.get("artistId") as string;
    const datasetVersionId = formData.get("datasetVersionId") as string;
    const licenseRecordId = formData.get("licenseRecordId") as string || null;
    const sharedCaption = formData.get("sharedCaption") as string || "";

    if (!artistId) {
      return { success: false, error: "Artist selection is required." };
    }
    if (!datasetVersionId) {
      return { success: false, error: "Dataset version selection is required." };
    }

    // Retrieve files
    const files = formData.getAll("files") as File[];
    if (!files || files.length === 0 || (files.length === 1 && files[0].size === 0)) {
      return { success: false, error: "No files uploaded." };
    }

    // Validate artist exists
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
    });
    if (!artist) {
      return { success: false, error: "The selected artist does not exist." };
    }

    // Validate dataset version exists and matches artist
    const datasetVersion = await prisma.datasetVersion.findUnique({
      where: { id: datasetVersionId },
    });
    if (!datasetVersion) {
      return { success: false, error: "The selected dataset version does not exist." };
    }
    if (datasetVersion.artistId !== artistId) {
      return { success: false, error: "The selected dataset version does not belong to the selected artist." };
    }

    // Validate license record matches artist if provided
    if (licenseRecordId) {
      const licenseRecord = await prisma.consentOrLicenseRecord.findUnique({
        where: { id: licenseRecordId },
      });
      if (!licenseRecord) {
        return { success: false, error: "The selected license record does not exist." };
      }
      if (licenseRecord.artistId !== artistId) {
        return { success: false, error: "The selected license record does not belong to the selected artist." };
      }
    }

    // Prepare upload directory paths
    const artistSlug = artist.slug;
    const uploadDirRelative = `/uploads/datasets/${artistSlug}/${datasetVersionId}/raw`;
    const uploadDirAbsolute = path.join(process.cwd(), "public", uploadDirRelative);

    // Ensure the folder exists recursively
    fs.mkdirSync(uploadDirAbsolute, { recursive: true });

    let uploadedCount = 0;

    for (const file of files) {
      if (!file || file.size === 0) continue;

      // 1. Validate file format
      const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
      const ext = path.extname(file.name).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return { success: false, error: `Unsupported file type: ${file.name}. Only .jpg, .jpeg, .png, and .webp are allowed.` };
      }

      // 2. Read array buffer and convert to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 3. Generate SHA-256 Hash
      const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");

      // 4. Sanitize original filename and append unique suffix if collision occurs
      const baseName = path.basename(file.name, ext);
      let sanitizedBase = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
      if (!sanitizedBase) sanitizedBase = "image";

      let finalFileName = `${sanitizedBase}${ext}`;
      let finalFilePathAbsolute = path.join(uploadDirAbsolute, finalFileName);
      let counter = 1;

      while (fs.existsSync(finalFilePathAbsolute)) {
        finalFileName = `${sanitizedBase}_${counter}${ext}`;
        finalFilePathAbsolute = path.join(uploadDirAbsolute, finalFileName);
        counter++;
      }

      // 5. Save buffer to local filesystem
      fs.writeFileSync(finalFilePathAbsolute, buffer);

      // 6. Extract image dimensions (width, height)
      let width: number | null = null;
      let height: number | null = null;
      try {
        const dimensions = sizeOf(buffer);
        width = dimensions.width || null;
        height = dimensions.height || null;
      } catch (err) {
        console.warn(`Could not parse dimensions for ${file.name}:`, err);
      }

      // 7. Store dataset image record in database
      const storagePath = `${uploadDirRelative}/${finalFileName}`;
      const createdImage = await prisma.datasetImage.create({
        data: {
          artistId,
          datasetVersionId,
          licenseRecordId: licenseRecordId || null,
          filename: finalFileName,
          storagePath,
          caption: sharedCaption && sharedCaption.trim() !== "" ? sharedCaption.trim() : null,
          width,
          height,
          sha256Hash,
          qualityStatus: "uploaded_pending_review",
        },
      });

      // 8. Write AuditLog
      await prisma.auditLog.create({
        data: {
          action: "dataset_image_uploaded",
          entityType: "DatasetImage",
          entityId: createdImage.id,
          metadataJson: {
            artistId,
            datasetVersionId,
            filename: finalFileName,
            storagePath,
            sha256Hash,
          },
        },
      });

      uploadedCount++;
    }

    // 9. Recalculate version imageCount
    await recalculateDatasetImageCount(datasetVersionId);

    // 10. Revalidate datasets route cache
    revalidatePath("/admin/datasets");

    return { success: true, count: uploadedCount };
  } catch (error) {
    console.error("Error in uploadDatasetImages action:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred during batch file upload.",
    };
  }
}
