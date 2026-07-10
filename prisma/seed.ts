import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run Prisma seed data.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PROTOTYPE_BIO =
  "Prototype museum/public-domain style used only for internal technical testing. Not a participating living creator.";

const PROTOTYPE_LICENSE_NOTE =
  "Prototype placeholder. Replace with verified museum/open-access source records before using actual images. This is not consent from a living creator.";

function todayAtLocalMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function seedArtistStyle({
  displayName,
  slug,
  licenseSourceUrl,
  datasetVersionName,
  datasetStoragePath,
  adapterName,
  adapterFilePath,
  triggerToken,
}: {
  displayName: string;
  slug: string;
  licenseSourceUrl: string;
  datasetVersionName: string;
  datasetStoragePath: string;
  adapterName: string;
  adapterFilePath: string;
  triggerToken: string;
}) {
  const artist = await prisma.artist.upsert({
    where: { slug },
    update: {
      displayName,
      type: "museum_prototype",
      status: "active",
      bio: PROTOTYPE_BIO,
    },
    create: {
      displayName,
      slug,
      type: "museum_prototype",
      status: "active",
      bio: PROTOTYPE_BIO,
    },
  });

  await prisma.consentOrLicenseRecord.upsert({
    where: { id: `seed-license-${slug}` },
    update: {
      artistId: artist.id,
      recordType: "museum_license",
      rightsBasis: "public_domain_or_open_access_to_be_verified",
      sourceName: "Museum/public-domain collection placeholder",
      sourceUrl: licenseSourceUrl,
      commercialAllowed: false,
      trainingAllowed: true,
      attributionRequired: true,
      notes: PROTOTYPE_LICENSE_NOTE,
    },
    create: {
      id: `seed-license-${slug}`,
      artistId: artist.id,
      recordType: "museum_license",
      rightsBasis: "public_domain_or_open_access_to_be_verified",
      sourceName: "Museum/public-domain collection placeholder",
      sourceUrl: licenseSourceUrl,
      commercialAllowed: false,
      trainingAllowed: true,
      attributionRequired: true,
      notes: PROTOTYPE_LICENSE_NOTE,
    },
  });

  const datasetVersion = await prisma.datasetVersion.upsert({
    where: { id: `seed-dataset-${slug}-v1` },
    update: {
      artistId: artist.id,
      versionName: datasetVersionName,
      status: "draft",
      imageCount: 0,
      storagePath: datasetStoragePath,
    },
    create: {
      id: `seed-dataset-${slug}-v1`,
      artistId: artist.id,
      versionName: datasetVersionName,
      status: "draft",
      imageCount: 0,
      storagePath: datasetStoragePath,
    },
  });

  await prisma.modelAdapter.upsert({
    where: { id: `seed-adapter-${slug}-lora-v1` },
    update: {
      artistId: artist.id,
      datasetVersionId: datasetVersion.id,
      adapterName,
      baseModel: "stable-diffusion-1.5",
      adapterType: "lora",
      filePath: adapterFilePath,
      triggerToken,
      status: "placeholder_registered",
      trainingNotebookUrl: null,
    },
    create: {
      id: `seed-adapter-${slug}-lora-v1`,
      artistId: artist.id,
      datasetVersionId: datasetVersion.id,
      adapterName,
      baseModel: "stable-diffusion-1.5",
      adapterType: "lora",
      filePath: adapterFilePath,
      triggerToken,
      status: "placeholder_registered",
      trainingNotebookUrl: null,
    },
  });

  return artist;
}

async function main() {
  // Prototype/demo only. Real commercial launch requires verified rights,
  // explicit creator consent where applicable, and legal review.
  const today = todayAtLocalMidnight();

  const hokusai = await seedArtistStyle({
    displayName: "Katsushika Hokusai",
    slug: "hokusai",
    licenseSourceUrl: "https://example.com/hokusai-source-to-replace",
    datasetVersionName: "hokusai-v1-manual",
    datasetStoragePath: "data/artists/hokusai/v1",
    adapterName: "hokusai-lora-v1",
    adapterFilePath: "models/adapters/hokusai-lora-v1.safetensors",
    triggerToken: "hokusai_style",
  });

  const hiroshige = await seedArtistStyle({
    displayName: "Utagawa Hiroshige",
    slug: "hiroshige",
    licenseSourceUrl: "https://example.com/hiroshige-source-to-replace",
    datasetVersionName: "hiroshige-v1-manual",
    datasetStoragePath: "data/artists/hiroshige/v1",
    adapterName: "hiroshige-lora-v1",
    adapterFilePath: "models/adapters/hiroshige-lora-v1.safetensors",
    triggerToken: "hiroshige_style",
  });

  await prisma.dailyTheme.upsert({
    where: { id: `seed-daily-theme-fox-moonlight-${localDateKey(today)}` },
    update: {
      themeText: "A fox under the moonlight",
      themeDate: today,
      description:
        "Daily drawing challenge for testing image-theme similarity validation. Submissions are stored as candidate training data only after review.",
      status: "active",
      positivePrompts: [
        "a drawing of a fox under moonlight",
        "an illustration of a fox beneath the moon",
        "a nocturnal fox scene",
        "a sketch of a fox at night",
        "a symbolic artwork about a fox in moonlight",
      ],
      negativePrompts: [
        "a dog at night",
        "a wolf under the moon",
        "a cat in darkness",
        "an empty night landscape",
        "random abstract drawing",
      ],
      acceptThreshold: 0.12,
      reviewThreshold: 0.04,
    },
    create: {
      id: `seed-daily-theme-fox-moonlight-${localDateKey(today)}`,
      themeText: "A fox under the moonlight",
      themeDate: today,
      description:
        "Daily drawing challenge for testing image-theme similarity validation. Submissions are stored as candidate training data only after review.",
      status: "active",
      positivePrompts: [
        "a drawing of a fox under moonlight",
        "an illustration of a fox beneath the moon",
        "a nocturnal fox scene",
        "a sketch of a fox at night",
        "a symbolic artwork about a fox in moonlight",
      ],
      negativePrompts: [
        "a dog at night",
        "a wolf under the moon",
        "a cat in darkness",
        "an empty night landscape",
        "random abstract drawing",
      ],
      acceptThreshold: 0.12,
      reviewThreshold: 0.04,
    },
  });

  console.log("Seeded museum prototype artist styles:", {
    artists: [hokusai.slug, hiroshige.slug],
    dailyThemeDate: localDateKey(today),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
