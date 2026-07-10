import React from "react";
import { prisma } from "@/lib/prisma";
import { GenerationRequest, Artist, ModelAdapter, DatasetVersion } from "@prisma/client";
import AdminGenerationsManager from "@/components/AdminGenerationsManager";

export const revalidate = 0; // Dynamic page, ensure fresh data on every load

type GenerationWithRelations = GenerationRequest & {
  artist: Artist;
  modelAdapter: ModelAdapter | null;
  datasetVersion: DatasetVersion | null;
};

export default async function GenerationsAdminPage() {
  let generations: GenerationWithRelations[] = [];
  let loadError: unknown = null;

  try {
    generations = await prisma.generationRequest.findMany({
      include: {
        artist: true,
        modelAdapter: true,
        datasetVersion: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    console.error("❌ Failed to query generations administrative list:", loadError);
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm text-red-950">
          <div className="flex items-center gap-3 text-red-800">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-base font-bold">Query Operations Failure</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            Could not fetch image generation history logs from the database registry.
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
    <div className="p-6 md:p-8 space-y-8 text-slate-900">
      {/* Page Header Area */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Generation Requests</h1>
        <p className="mt-1 text-sm text-slate-500 leading-relaxed">
          Monitor neural style adapter image generations. Inspect copyable parameters, upload external render files, and log simulated artist royalties.
        </p>
      </div>

      {/* Main Interactive Manager Component */}
      <AdminGenerationsManager initialGenerations={generations} />
    </div>
  );
}
