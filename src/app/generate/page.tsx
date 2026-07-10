import React from "react";
import { prisma } from "@/lib/prisma";
import GenerationInterface from "@/components/GenerationInterface";

export const revalidate = 0; // Dynamic rendering, ensure we always fetch fresh adapters

export default async function GeneratePage() {
  let artistsWithAdapters: Parameters<typeof GenerationInterface>[0]["artists"] = [];
  let loadError: unknown = null;

  try {
    // Select only artists who have at least one registered model adapter configuration
    artistsWithAdapters = await prisma.artist.findMany({
      where: {
        modelAdapters: {
          some: {}, // Forces matching only artists with >= 1 adapter
        },
      },
      include: {
        modelAdapters: {
          include: {
            datasetVersion: {
              select: {
                id: true,
                versionName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        displayName: "asc",
      },
    });
  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    console.error("Database query failure on /generate page:", loadError);
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm text-red-950">
          <div className="flex items-center gap-3 text-red-800">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-base font-bold">Inference Registry Failure</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            Could not fetch registered artist weights configuration from the database registry.
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
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600">
          <span>Creative Studio</span>
          <span>•</span>
          <span>Style Lab</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">AI Style Generator</h1>
        <p className="mt-1 text-sm text-slate-500 leading-relaxed">
          Select an authorized creator style model adapter, write a prompt, and simulate real-time neural style rendering.
        </p>
      </div>

      {/* Generation Control Center Canvas */}
      {artistsWithAdapters.length > 0 ? (
        <GenerationInterface artists={artistsWithAdapters} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm text-center max-w-xl mx-auto space-y-4">
          <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">No Adapters Deployed</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Before you can generate images, you must register at least one model adapter in the Model Adapter section.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/admin/adapters"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none transition-all"
            >
              Deploy First Model Adapter
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
