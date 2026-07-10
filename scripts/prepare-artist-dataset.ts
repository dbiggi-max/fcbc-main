import fs from "fs";
import path from "path";
import crypto from "crypto";
import { imageSize } from "image-size";

/**
 * Helper to parse CLI arguments of the form:
 * --artist hokusai --version v1
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let artist = "";
  let version = "";

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--artist" || args[i] === "-a") && i + 1 < args.length) {
      artist = args[i + 1].trim().toLowerCase();
    } else if ((args[i] === "--version" || args[i] === "-v") && i + 1 < args.length) {
      version = args[i + 1].trim().toLowerCase();
    }
  }

  return { artist, version };
}

/**
 * Computes the SHA-256 hash of a file synchronously.
 */
function computeSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

async function main() {
  const { artist, version } = parseArgs();

  if (!artist || !version) {
    console.error("❌ Error: Missing parameters.");
    console.info("Usage: npm run dataset:prepare -- --artist {artistSlug} --version {versionName}");
    console.info("Example: npm run dataset:prepare -- --artist hokusai --version v1");
    process.exit(1);
  }

  const artistDir = path.resolve(process.cwd(), "data/artists", artist, version);
  const rawDir = path.join(artistDir, "raw");
  const captionsDir = path.join(artistDir, "captions");
  const manifestPath = path.join(artistDir, "manifest.json");

  if (!fs.existsSync(rawDir)) {
    console.error(`❌ Error: Source directory does not exist: ${rawDir}`);
    process.exit(1);
  }

  console.info(`========================================================`);
  console.info(`🛠️  PREPARING MUSEUM DATASET MANIFEST`);
  console.info(`👉 Artist: ${artist}`);
  console.info(`👉 Version: ${version}`);
  console.info(`👉 Scan path: ${rawDir}`);
  console.info(`========================================================`);

  // Detect image files
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const files = fs.readdirSync(rawDir);
  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return allowedExtensions.includes(ext);
  });

  if (imageFiles.length === 0) {
    console.warn(`⚠️  No images found matching extensions: ${allowedExtensions.join(", ")}`);
    console.warn(`Place images inside data/artists/${artist}/${version}/raw/ to begin.`);
  } else {
    console.info(`📁 Detected ${imageFiles.length} image files to process...`);
  }

  // Load existing manifest if any to preserve custom metadata if already entered
  let existingManifestMap = new Map<string, any>();
  if (fs.existsSync(manifestPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.filename) {
            existingManifestMap.set(item.filename, item);
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️  Failed to read existing manifest at ${manifestPath}. Re-generating from scratch.`);
    }
  }

  const manifestItems: any[] = [];

  for (const filename of imageFiles) {
    const rawPath = path.join(rawDir, filename);
    const relativeRawPath = `data/artists/${artist}/${version}/raw/${filename}`;
    
    // Hash
    const sha256Hash = computeSha256(rawPath);

    // Caption
    const baseName = path.parse(filename).name;
    const captionFile = path.join(captionsDir, `${baseName}.txt`);
    let caption: string | undefined = undefined;
    let captionPath: string | undefined = undefined;

    if (fs.existsSync(captionFile)) {
      caption = fs.readFileSync(captionFile, "utf-8").trim();
      captionPath = `data/artists/${artist}/${version}/captions/${baseName}.txt`;
    }

    // Dimensions
    let width: number | null = null;
    let height: number | null = null;
    try {
      const dimensions = imageSize(fs.readFileSync(rawPath));
      width = dimensions.width || null;
      height = dimensions.height || null;
    } catch (dimErr) {
      console.warn(`⚠️  Unable to read dimensions for ${filename}:`, dimErr instanceof Error ? dimErr.message : dimErr);
    }

    // Check if we have existing manual entries we should preserve (like sourceUrl, rightsBasis, etc)
    const existing = existingManifestMap.get(filename);

    manifestItems.push({
      artistSlug: artist,
      version: version,
      filename,
      rawPath: relativeRawPath,
      captionPath: captionPath || existing?.captionPath || null,
      caption: caption || existing?.caption || null,
      sha256Hash,
      sourceUrl: existing?.sourceUrl || null,
      sourceName: existing?.sourceName || null,
      rightsBasis: existing?.rightsBasis || "public_domain_or_open_access_to_be_verified",
      licenseNotes: existing?.licenseNotes || "Prototype placeholder. Replace with verified museum/open-access source records before production fine-tuning.",
      width,
      height,
    });
  }

  // Write pretty json manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifestItems, null, 2), "utf-8");

  console.info(`✅ Manifest successfully created/updated at:`);
  console.info(`   ${manifestPath}`);
  console.info(`========================================================\n`);
}

main().catch((err) => {
  console.error("❌ Program crashed with exception:", err);
  process.exit(1);
});
