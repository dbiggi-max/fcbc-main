import React from "react";
import { prisma } from "@/lib/prisma";
import { Artist, DatasetVersion, DatasetImage, ConsentOrLicenseRecord } from "@prisma/client";
import { AdminTableHeader, StatusBadge, EmptyState } from "@/components/admin-helpers";
import DatasetImageForm from "@/components/DatasetImageForm";
import DatasetImageUploadForm from "@/components/DatasetImageUploadForm";
import DatasetImageWithFallback from "@/components/DatasetImageWithFallback";

export const revalidate = 0; // Dynamic data loading

type DatasetVersionWithArtist = DatasetVersion & {
  artist: Artist;
};

type DatasetImageWithRelations = DatasetImage & {
  artist: Artist;
  datasetVersion: DatasetVersion;
  licenseRecord: ConsentOrLicenseRecord | null;
};

export default async function DatasetsPage() {
  let datasetVersions: DatasetVersionWithArtist[] = [];
  let datasetImages: DatasetImageWithRelations[] = [];
  let artists: Artist[] = [];
  let licenseRecords: ConsentOrLicenseRecord[] = [];
  let loadError: unknown = null;

  try {
    const [versions, images, allArtists, licenses] = await Promise.all([
      prisma.datasetVersion.findMany({
        include: {
          artist: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.datasetImage.findMany({
        include: {
          artist: true,
          datasetVersion: true,
          licenseRecord: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.artist.findMany({
        orderBy: {
          displayName: "asc",
        },
      }),
      prisma.consentOrLicenseRecord.findMany({
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    datasetVersions = versions;
    datasetImages = images;
    artists = allArtists;
    licenseRecords = licenses;
  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    console.error("Prisma load error in /admin/datasets page:", loadError);
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm text-red-950">
          <div className="flex items-center gap-3 text-red-800">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-base font-bold">Database Query Failure</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            Could not retrieve dataset records. Please review database configurations.
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

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Dataset Management
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-3xl">
          Manage image training datasets, track asset provenance, verify image captions,
          and monitor quality validation pipelines for style fine-tuning.
        </p>
      </div>

      {/* 5. Prototype Guidance Notice */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4.5 text-slate-800 shadow-sm leading-relaxed text-xs sm:text-sm">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-bold text-indigo-900">Training Guidance:</span>{" "}
            Register only company-owned, public-domain, open-access, or explicitly authorized images. 
            For museum prototype styles, replace placeholder source URLs with verified museum or open-access records before training.
          </div>
        </div>
      </div>

      {/* Museum Dataset Preparation Workflow Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">Museum Dataset Preparation Workflow</h2>
            <p className="text-xs text-slate-500 leading-normal">
              Follow this step-by-step pipeline to organize and import public-domain artwork assets into the style training catalog.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white font-mono">1</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Source Images</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Acquire 30–80 high-res public-domain woodblock print images and place inside:
            </p>
            <code className="block rounded-lg bg-slate-50 p-2 text-[10px] font-mono text-slate-700 break-all leading-normal">
              data/artists/&#123;artistSlug&#125;/v1/raw/
            </code>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white font-mono">2</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Add Captions</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Write matching `.txt` captions for each image for LoRA training alignment:
            </p>
            <code className="block rounded-lg bg-slate-50 p-2 text-[10px] font-mono text-slate-700 break-all leading-normal">
              data/artists/&#123;artistSlug&#125;/v1/captions/
            </code>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white font-mono">3</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Generate Manifest</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Run the compiler script to compute file hashes and build `manifest.json`:
            </p>
            <div className="rounded-lg bg-slate-900 p-2 text-[10px] font-mono text-indigo-300 break-all leading-normal">
              npm run dataset:prepare -- --artist hokusai --version v1
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white font-mono">4</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Provenance</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Open the generated `SOURCES.md` file and document titles, museum records, and licenses:
            </p>
            <code className="block rounded-lg bg-slate-50 p-2 text-[10px] font-mono text-slate-700 break-all leading-normal">
              data/artists/&#123;artistSlug&#125;/v1/SOURCES.md
            </code>
          </div>

          {/* Step 5 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white font-mono">5</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Import Ingestion</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Import the manifest metadata directly into PostgreSQL:
            </p>
            <div className="rounded-lg bg-slate-900 p-2 text-[10px] font-mono text-indigo-300 break-all leading-normal">
              npm run dataset:import -- --artist hokusai --version v1
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content (2/3 Tables, 1/3 Forms & Guides) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Tables (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* 1. Dataset Versions Table */}
          <section className="space-y-4">
            <AdminTableHeader
              title="Dataset Versions"
              subtitle="Training package versions containing approved, high-resolution styles."
              badgeCount={datasetVersions.length}
            />

            {datasetVersions.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Artist</th>
                        <th className="px-6 py-4">Version Name</th>
                        <th className="px-6 py-4">Images</th>
                        <th className="px-6 py-4">Storage Path</th>
                        <th className="px-6 py-4">Created Date</th>
                        <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm text-slate-600">
                      {datasetVersions.map((version) => {
                        const formattedDate = new Date(version.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });

                        return (
                          <tr key={version.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="whitespace-nowrap px-6 py-4.5 font-semibold text-slate-900">
                              {version.artist.displayName}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 font-mono text-xs text-slate-500">
                              {version.versionName}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 font-medium text-slate-800">
                              {version.imageCount}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 font-mono text-xs text-slate-400">
                              {version.storagePath || "N/A"}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 text-slate-500">
                              {formattedDate}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 text-right">
                              <StatusBadge status={version.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                message="No dataset versions found"
                subtitle="Wait for dataset seeding or run the database seeder to establish initial version records."
              />
            )}
          </section>

          {/* 2. Dataset Images Table */}
          <section className="space-y-4">
            <AdminTableHeader
              title="Dataset Images"
              subtitle="Individual cataloged assets inside the active style training packages."
              badgeCount={datasetImages.length}
            />

            {datasetImages.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Preview</th>
                        <th className="px-6 py-4">Artist</th>
                        <th className="px-6 py-4">Version</th>
                        <th className="px-6 py-4">Filename</th>
                        <th className="px-6 py-4">Caption</th>
                        <th className="px-6 py-4">Source URL</th>
                        <th className="px-6 py-4">License/Source Record</th>
                        <th className="px-6 py-4">Storage Path</th>
                        <th className="px-6 py-4">Created Date</th>
                        <th className="px-6 py-4 text-right">Quality</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm text-slate-600">
                      {datasetImages.map((image) => {
                        const formattedDate = new Date(image.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });

                        return (
                          <tr key={image.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="whitespace-nowrap px-6 py-4.5">
                              <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                                <DatasetImageWithFallback
                                  src={image.storagePath}
                                  alt={image.filename}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 font-semibold text-slate-900">
                              {image.artist.displayName}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 font-mono text-xs text-slate-500">
                              {image.datasetVersion.versionName}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 font-semibold text-slate-800">
                              {image.filename}
                            </td>
                            <td className="px-6 py-4.5 text-slate-600 max-w-xs truncate" title={image.caption || ""}>
                              {image.caption || "No caption"}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 text-xs">
                              {image.sourceUrl ? (
                                <a
                                  href={image.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:underline hover:text-indigo-700 transition-colors font-medium"
                                >
                                  Source Record
                                </a>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4.5 text-xs text-slate-500 max-w-xs truncate" title={image.licenseRecord ? `${image.licenseRecord.rightsBasis} (${image.licenseRecord.recordType})` : ""}>
                              {image.licenseRecord ? (
                                <span className="font-medium text-slate-700">
                                  {image.licenseRecord.rightsBasis} <span className="text-slate-400">({image.licenseRecord.recordType})</span>
                                </span>
                              ) : (
                                <span className="text-slate-400">None</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 font-mono text-xs text-slate-400">
                              {image.storagePath}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 text-slate-500">
                              {formattedDate}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4.5 text-right">
                              <StatusBadge status={image.qualityStatus} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                message="No dataset images registered yet."
                subtitle="Use the registration form on the right to catalog your first dataset image metadata record."
              />
            )}
          </section>
        </div>

        {/* Right Side: Sidebar Panels (1/3 width on desktop) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Pending Status Explanation Notice */}
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white p-5 shadow-sm text-slate-800 text-xs leading-relaxed">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Review & Training Pipeline</h3>
                <p className="mt-1.5 text-slate-500">
                  Images uploaded via drag-and-drop are automatically tagged as <span className="font-semibold text-indigo-700">uploaded_pending_review</span>.
                </p>
                <p className="mt-1 text-slate-500">
                  An administrator must review and approve these assets (<span className="font-semibold text-emerald-700">approved_for_training</span>) before launching style fine-tuning.
                </p>
              </div>
            </div>
          </div>

          {/* Drag-and-Drop Batch Uploader Form */}
          <DatasetImageUploadForm
            artists={artists}
            allDatasetVersions={datasetVersions}
            allLicenseRecords={licenseRecords}
          />
          
          {/* Collapsible Manual Registration Form */}
          <DatasetImageForm
            artists={artists}
            allDatasetVersions={datasetVersions}
            allLicenseRecords={licenseRecords}
          />

          {/* 6. Museum Dataset Checklist Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-slate-900">
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h2 className="text-sm font-bold text-slate-800">Museum Dataset Checklist</h2>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <svg className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Verify public-domain or open-access legal status before training.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Save and record original museum source URLs for legal transparency.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Document title, historical creator, and catalog details when available.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Maintain strictly separate directories for Hokusai and Hiroshige images.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Add descriptive text captions for effective LoRA style training.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-slate-500 italic">Do not mix different artists&apos; styles in the same dataset version.</span>
              </li>
            </ul>
          </div>

          {/* 7. Suggested Folder Convention Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-slate-900">
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h2 className="text-sm font-bold text-slate-800">Storage Structure</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Recommended folder paths on local workspace storage:
            </p>
            <div className="rounded-lg bg-slate-900 p-3.5 text-xs text-indigo-300 font-mono space-y-1 overflow-x-auto">
              <p className="text-slate-400"># Katsushika Hokusai</p>
              <p>data/artists/hokusai/v1/raw</p>
              <p>data/artists/hokusai/v1/captions</p>
              <div className="border-b border-slate-800 my-1.5"></div>
              <p className="text-slate-400"># Utagawa Hiroshige</p>
              <p>data/artists/hiroshige/v1/raw</p>
              <p>data/artists/hiroshige/v1/captions</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
