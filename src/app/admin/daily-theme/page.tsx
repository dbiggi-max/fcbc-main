import React from "react";
import { prisma } from "@/lib/prisma";
import AdminDailyThemeDashboard from "@/components/AdminDailyThemeDashboard";

export const revalidate = 0; // Ensure fresh data on requests

export default async function AdminDailyThemePage() {
  let themes: any[] = [];
  let submissions: any[] = [];
  let artists: any[] = [];
  let datasetVersions: any[] = [];
  let licenseRecords: any[] = [];
  let loadError: unknown = null;

  try {
    // 1. Query all system DailyThemes with submission aggregate count
    themes = await prisma.dailyTheme.findMany({
      orderBy: {
        themeDate: "desc",
      },
      include: {
        _count: {
          select: { themeSubmissions: true },
        },
      },
    });

    // 2. Query all ThemeSubmissions with related theme and linked creator style profiles
    submissions = await prisma.themeSubmission.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        dailyTheme: true,
        artist: true,
        validationAttempts: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });


    // 3. Query all artists
    artists = await prisma.artist.findMany({
      orderBy: {
        displayName: "asc",
      },
    });

    // 4. Query all dataset versions
    datasetVersions = await prisma.datasetVersion.findMany({
      orderBy: {
        versionName: "asc",
      },
    });

    // 5. Query all license/consent records
    licenseRecords = await prisma.consentOrLicenseRecord.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    console.error("Database query error inside admin /daily-theme review page:", loadError);
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm text-red-950">
          <div className="flex items-center gap-3 text-red-800">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-base font-bold">Query Failure</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            Could not query the submissions verification queue from PostgreSQL.
          </p>
          {loadError instanceof Error && (
            <pre className="mt-4 overflow-auto rounded bg-red-100 p-3 text-xs font-mono text-red-900">
              {loadError.message}
            </pre>
          )}
        </div>
      </div>
    );
  }

  const validatorProvider = (process.env.THEME_VALIDATOR_PROVIDER || "mock").trim().toLowerCase();

  // Load global settings or initialize default fallback
  let validationSettings: any = null;
  try {
    validationSettings = await prisma.validationSettings.findUnique({
      where: { id: "global" },
    });
  } catch (err) {
    console.warn("[Admin Page] Settings schema missing or read failed:", err);
  }

  if (!validationSettings) {
    validationSettings = {
      id: "global",
      provider: validatorProvider,
      modelName: "ViT-B-32",
      pretrainedName: "laion2b_s34b_b79k",
      promptStrategy: "hybrid_similarity",
      rawMin: 0.15,
      rawMax: 0.35,
      acceptThreshold: 0.45,
      rejectThreshold: 0.45,
    };
  }

  return (
    <AdminDailyThemeDashboard
      initialThemes={themes}
      initialSubmissions={submissions}
      artists={artists}
      datasetVersions={datasetVersions}
      licenseRecords={licenseRecords}
      validatorProvider={validatorProvider}
      validationSettings={validationSettings}
    />
  );
}
