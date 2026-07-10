import React from "react";
import { prisma } from "@/lib/prisma";
import { Artist, DatasetVersion, ModelAdapter } from "@prisma/client";
import { AdminTableHeader, StatusBadge, EmptyState } from "@/components/admin-helpers";
import ModelAdapterForm from "@/components/ModelAdapterForm";

export const revalidate = 0; // Ensure fresh data on every fetch

type ModelAdapterWithRelations = ModelAdapter & {
  artist: Artist;
  datasetVersion: DatasetVersion | null;
};

export default async function AdaptersPage() {
  let modelAdapters: ModelAdapterWithRelations[] = [];
  let artists: Artist[] = [];
  let allDatasetVersions: DatasetVersion[] = [];
  let loadError: unknown = null;

  try {
    modelAdapters = await prisma.modelAdapter.findMany({
      include: {
        artist: true,
        datasetVersion: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    artists = await prisma.artist.findMany({
      orderBy: {
        displayName: "asc",
      },
    });

    allDatasetVersions = await prisma.datasetVersion.findMany({
      orderBy: {
        versionName: "asc",
      },
    });
  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    console.error("Prisma load error in /admin/adapters page:", loadError);
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
            Could not retrieve model adapters. Please check database connectivity and configuration.
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
      {/* 1. Header Area */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Model Adapters</h1>
        <p className="mt-1 text-sm text-slate-500 leading-relaxed">
          Manage dynamic neural weight adapters (LoRAs) layered on top of base foundation checkpoint weights.
        </p>
      </div>

      {/* 2. Top Grid: Form + Advice Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Cascading Form (occupies 2 columns) */}
        <div className="lg:col-span-2">
          <ModelAdapterForm artists={artists} allDatasetVersions={allDatasetVersions} />
        </div>

        {/* Right Side: Advisory Panels (occupies 1 column) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 flex flex-col justify-between">
          {/* Explanation Panel */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <svg className="h-5 w-5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Style Lab Architecture
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Each artist style is represented by a separate LoRA model adapter. This architecture enables per-artist attribution, allows dynamic deactivation of specific styles without rebuilds, and maintains transparent royalty distribution flows.
            </p>
          </div>

          <div className="border-t border-slate-100"></div>

          {/* File Path Examples */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <svg className="h-5 w-5 text-cyan-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              File Path Conventions
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Weight references should point to directory volumes served by the style generator. Follow these standard naming patterns:
            </p>
            <div className="space-y-2">
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 font-mono text-[10px] text-slate-600 break-all select-all">
                models/adapters/hokusai-lora-v1.safetensors
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 font-mono text-[10px] text-slate-600 break-all select-all">
                models/adapters/hiroshige-lora-v1.safetensors
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100"></div>

          {/* Training advisory reminder */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Advisory Checklist
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Registering an adapter acts as a configuration manifest. Real weight files (`.safetensors`) will be computed later on-demand and stored at the designated volume file paths.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Table Area Header */}
      <div className="pt-4">
        <AdminTableHeader
          title="Deployed Model Adapters"
          subtitle="Model adapter checkpoints registered in the local registry database."
          badgeCount={modelAdapters.length}
        />

        {/* 4. Table list */}
        {modelAdapters.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Artist</th>
                    <th className="px-6 py-4">Adapter Name</th>
                    <th className="px-6 py-4">Base Model</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Trigger Token</th>
                    <th className="px-6 py-4">Dataset Version</th>
                    <th className="px-6 py-4">File Path</th>
                    <th className="px-6 py-4">Notebook / Run</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-600">
                  {modelAdapters.map((adapter) => {
                    const formattedDate = new Date(adapter.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <tr key={adapter.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4.5 font-semibold text-slate-900">
                          {adapter.artist.displayName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5 text-slate-800 font-medium">
                          {adapter.adapterName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5 font-mono text-xs text-slate-500">
                          {adapter.baseModel}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5 uppercase text-xs font-bold text-slate-500">
                          {adapter.adapterType}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5">
                          {adapter.triggerToken ? (
                            <span className="font-mono text-xs text-cyan-700 bg-cyan-50/50 rounded px-1.5 py-0.5 border border-cyan-100 inline-block">
                              {adapter.triggerToken}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">None</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5 font-mono text-xs text-slate-500">
                          {adapter.datasetVersion?.versionName || (
                            <span className="text-slate-400 font-sans italic text-xs">None connected</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5 font-mono text-xs text-slate-400" title={adapter.filePath || ""}>
                          {adapter.filePath || "N/A"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5">
                          {adapter.trainingNotebookUrl ? (
                            <a
                              href={adapter.trainingNotebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-md px-2 py-1 font-semibold transition-all"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View Run
                            </a>
                          ) : (
                            <span className="text-slate-400 italic text-xs">None</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5 text-slate-500">
                          {formattedDate}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4.5 text-right">
                          <StatusBadge status={adapter.status} />
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
            message="No model adapters registered yet"
            subtitle="Register style dataset versions and catalog their trained adapter weights above."
          />
        )}
      </div>
    </div>
  );
}
