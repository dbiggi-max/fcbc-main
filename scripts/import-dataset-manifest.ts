import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

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

async function main() {
  const { artist: artistSlug, version } = parseArgs();

  if (!artistSlug || !version) {
    console.error("❌ Error: Missing parameters.");
    console.info("Usage: npm run dataset:import -- --artist {artistSlug} --version {versionName}");
    console.info("Example: npm run dataset:import -- --artist hokusai --version v1");
    process.exit(1);
  }

  const manifestPath = path.resolve(process.cwd(), "data/artists", artistSlug, version, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Error: Manifest file not found: ${manifestPath}`);
    console.info("Run the preparation script first to compile manifest: npm run dataset:prepare");
    process.exit(1);
  }

  console.info(`========================================================`);
  console.info(`📥 IMPORTING MUSEUM DATASET MANIFEST INTO DATABASE`);
  console.info(`👉 Manifest: ${manifestPath}`);
  console.info(`========================================================`);

  // Load manifest
  let manifestItems: any[] = [];
  try {
    manifestItems = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch (err) {
    console.error("❌ Error: Failed to parse manifest JSON file:", err);
    process.exit(1);
  }

  if (manifestItems.length === 0) {
    console.warn("⚠️  Manifest is empty. No images to import.");
    process.exit(0);
  }

  // Set up Prisma PG client
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required to run the dataset importer.");
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Find Artist by slug
    const artist = await prisma.artist.findUnique({
      where: { slug: artistSlug }
    });

    if (!artist) {
      console.error(`❌ Error: Artist with slug "${artistSlug}" does not exist in the database.`);
      console.info("Make sure database is seeded first: npm run prisma:migrate or seed");
      process.exit(1);
    }

    // 2. Find DatasetVersion by versionName/storagePath and artistId
    // Standard seeded IDs match seed-dataset-{slug}-v1, and versionName is e.g. "hokusai-v1-manual"
    const datasetVersion = await prisma.datasetVersion.findFirst({
      where: {
        artistId: artist.id,
        OR: [
          { versionName: version },
          { versionName: `${artistSlug}-${version}-manual` },
          { storagePath: `data/artists/${artistSlug}/${version}` },
          { storagePath: `data/artists/${artistSlug}/${version}/` }
        ]
      }
    });

    if (!datasetVersion) {
      console.error(`❌ Error: DatasetVersion "${version}" for artist "${artistSlug}" does not exist.`);
      process.exit(1);
    }

    // 3. Find fallback licensing record for artist
    const fallbackLicense = await prisma.consentOrLicenseRecord.findFirst({
      where: { artistId: artist.id }
    });

    const licenseId = fallbackLicense?.id || null;
    if (!licenseId) {
      console.warn(`⚠️  Warning: No pre-existing license/consent records found for artist "${artistSlug}". Importing with null license ID.`);
    }

    console.info(`📍 Connected to Artist: ${artist.displayName} (ID: ${artist.id})`);
    console.info(`📍 Connected to Dataset Version: ${datasetVersion.versionName} (ID: ${datasetVersion.id})`);
    console.info(`📥 Importing ${manifestItems.length} images...`);

    let importedCount = 0;
    let updatedCount = 0;

    for (const item of manifestItems) {
      // Find existing image by SHA256 or matching filename + datasetVersionId
      const conditions: any[] = [
        {
          datasetVersionId: datasetVersion.id,
          filename: item.filename
        }
      ];

      if (item.sha256Hash) {
        conditions.push({ sha256Hash: item.sha256Hash });
      }

      const existingImage = await prisma.datasetImage.findFirst({
        where: {
          OR: conditions
        }
      });

      let dbImage;
      if (existingImage) {
        // Update existing record
        dbImage = await prisma.datasetImage.update({
          where: { id: existingImage.id },
          data: {
            storagePath: item.rawPath,
            caption: item.caption,
            width: item.width,
            height: item.height,
            sha256Hash: item.sha256Hash,
            sourceUrl: item.sourceUrl,
            licenseRecordId: licenseId,
            qualityStatus: "pending"
          }
        });
        updatedCount++;
      } else {
        // Create new record
        dbImage = await prisma.datasetImage.create({
          data: {
            artistId: artist.id,
            datasetVersionId: datasetVersion.id,
            filename: item.filename,
            storagePath: item.rawPath,
            caption: item.caption,
            width: item.width,
            height: item.height,
            sha256Hash: item.sha256Hash,
            sourceUrl: item.sourceUrl,
            licenseRecordId: licenseId,
            qualityStatus: "pending"
          }
        });
        importedCount++;
      }

      // 4. Create AuditLog record for the ingestion action
      await prisma.auditLog.create({
        data: {
          actorId: "system_dataset_importer",
          action: existingImage ? "dataset_image_reimported" : "dataset_image_imported",
          entityType: "dataset_image",
          entityId: dbImage.id,
          metadataJson: {
            filename: item.filename,
            artistSlug: artist.slug,
            version: version,
            sha256Hash: item.sha256Hash
          }
        }
      });
    }

    // 5. Recalculate and update DatasetVersion.imageCount
    const finalImageCount = await prisma.datasetImage.count({
      where: { datasetVersionId: datasetVersion.id }
    });

    await prisma.datasetVersion.update({
      where: { id: datasetVersion.id },
      data: { imageCount: finalImageCount }
    });

    console.info(`========================================================`);
    console.info(`✅ IMPORT PROCESS COMPLETE`);
    console.info(`👉 Upserted: ${manifestItems.length} records`);
    console.info(`👉 Created new: ${importedCount}`);
    console.info(`👉 Updated existing: ${updatedCount}`);
    console.info(`👉 Dataset Version imageCount updated to: ${finalImageCount}`);
    console.info(`========================================================\n`);

  } catch (error) {
    console.error("❌ Database transaction failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Importer crashed with exception:", err);
  process.exit(1);
});
