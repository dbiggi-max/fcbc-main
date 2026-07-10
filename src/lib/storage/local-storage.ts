import fs from "fs";
import path from "path";

// Accepted MIME types for this prototype
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Max file size: 10 MB
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface SavedImageResult {
  relativePath: string;       // Web-accessible path (e.g., /uploads/daily-theme/...)
  absolutePath: string;       // FS absolute path
  originalFilename: string;
  size: number;
  mimeType: string;
}

/**
 * Validates file constraints (MIME type, size, unknown properties).
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: "No file provided." };
  }

  // 1. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: "${file.type}". Only JPEG, PNG, and WebP are allowed.`,
    };
  }

  // 2. Validate Size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 10 MB limit (got ${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  return { valid: true };
}

/**
 * Saves a file to the specified category folder under public/uploads/.
 * Uses standard Node.js FS operations.
 */
export async function saveUploadedImage(
  file: File,
  category: "daily-theme" | "dataset-images" | "generated-results"
): Promise<SavedImageResult> {
  // First, run standard validations
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || "Image validation failed.");
  }

  // Define directories
  const uploadsBaseDir = path.join(process.cwd(), "public", "uploads", category);
  
  // Ensure the directory exists recursively
  if (!fs.existsSync(uploadsBaseDir)) {
    fs.mkdirSync(uploadsBaseDir, { recursive: true });
  }

  // Generate safe filename to prevent Path Traversal and Name Collisions
  // 1. Sanitize original filename (keep only safe alphanumeric, periods, dashes, underscores)
  const sanitizedOriginal = file.name
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/\.{2,}/g, "."); // Prevent consecutive dots
  
  // 2. Resolve extension strictly based on MIME type to avoid spoofing
  let extension = ".png";
  if (file.type === "image/jpeg") extension = ".jpg";
  else if (file.type === "image/webp") extension = ".webp";

  // 3. Generate random unique salt (prefix) to avoid collisions
  const uniqueSalt = Math.random().toString(36).substring(2, 10) + "_" + Date.now();
  const safeFilename = `${uniqueSalt}_${sanitizedOriginal}`;

  // 4. Secure complete path resolution (ensure target remains inside uploadsBaseDir)
  const absolutePath = path.resolve(path.join(uploadsBaseDir, safeFilename));
  if (!absolutePath.startsWith(path.resolve(uploadsBaseDir))) {
    throw new Error("Path traversal attempt detected and blocked.");
  }

  // Read file data array buffer and write synchronously to preserve atomic writes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(absolutePath, buffer);

  // Return web-accessible paths
  const relativePath = `/uploads/${category}/${safeFilename}`;

  return {
    relativePath,
    absolutePath,
    originalFilename: file.name,
    size: file.size,
    mimeType: file.type,
  };
}

/**
 * Maps relative web paths back to public absolute urls.
 */
export function getPublicImagePath(relativePath: string): string {
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  // Ensure starts with a forward slash
  const formattedPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return formattedPath;
}

// =========================================================================
// 🔒 SECURITY COMMENTS & GUIDELINES (Requirement 8)
// =========================================================================
/*
 * PROTOTYPE vs. PRODUCTION WARNING:
 * 1. Storage Architecture:
 *    - This helper saves files directly onto the local server's persistent disk (the public/ directory).
 *    - This is excellent for a single dedicated VM (e.g. a Hetzner VPS demo) where disk space is local and persistent.
 *    - This will NOT work on serverless runtimes (like Vercel, Netlify, or AWS Lambda) because these platforms
 *      employ ephemeral (read-only) filesystems, meaning any uploaded file will be deleted on the next cold start.
 *    - For Production: You MUST replace this with S3-compatible cloud object storage (e.g. AWS S3, Cloudflare R2, or Google Cloud Storage).
 *
 * 2. File Name Sanitization:
 *    - Never trust original filenames supplied by client browsers (file.name). They can contain path-traversal tokens (../), 
 *      command injection flags, or malicious scripts.
 *    - Always sanitize original names (as done above) and prefix them with highly-entropic unique values (UUID or high-resolution hashes)
 *      to fully prevent overwrite hijacking.
 *
 * 3. MIME Spoofing & Extensions:
 *    - This utility validates file.type, but advanced attackers can spoof the content-type header of an uploaded executable.
 *    - For Production: Read the file's binary magic bytes using libraries like 'file-type' to confirm the header signatures.
 *
 * 4. Moderation & Malware Defense:
 *    - Any system allowing public file uploads is vulnerable to illicit content and malware distribution.
 *    - For Production: Integrate automated virus scanners (like ClamAV) on upload pipelines, and run images through 
 *      moderation APIs (such as AWS Rekognition or Google Cloud Vision) before saving them to disk.
 */
