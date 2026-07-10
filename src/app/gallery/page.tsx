import React from "react";
import { prisma } from "@/lib/prisma";
import GalleryInterface from "@/components/GalleryInterface";

export const revalidate = 0; // Ensure fresh feeds on each visit

export default async function GalleryPage() {
  let generations: Parameters<typeof GalleryInterface>[0]["initialGenerations"] = [];
  let artists: Parameters<typeof GalleryInterface>[0]["artists"] = [];
  let loadError: unknown = null;

  try {
    // 1. Fetch generations with their deep artist and royalty attribution models
    generations = await prisma.generationRequest.findMany({
      include: {
        artist: {
          select: {
            id: true,
            displayName: true,
            slug: true,
          },
        },
        modelAdapter: {
          select: {
            id: true,
            adapterName: true,
            triggerToken: true,
          },
        },
        datasetVersion: {
          select: {
            id: true,
            versionName: true,
          },
        },
        royaltyEvent: {
          select: {
            id: true,
            amountCents: true,
            currency: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 2. Fetch all onboarded artists to feed filter option selectors
    artists = await prisma.artist.findMany({
      select: {
        id: true,
        displayName: true,
        slug: true,
      },
      orderBy: {
        displayName: "asc",
      },
    });
  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    console.error("Database query failure on /gallery page:", loadError);
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm text-red-950">
          <div className="flex items-center gap-3 text-red-800">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-base font-bold">Provenance Load Error</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            Could not query the platform&apos;s style render indices from the database registry.
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
      {/* Gallery Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600">
          <span>Public Ledger</span>
          <span>•</span>
          <span>Attribution Showroom</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Generated Image Gallery</h1>
        <p className="mt-1 text-sm text-slate-500 leading-relaxed">
          Verify style-attribution and watch live simulated JPY royalty logs linked directly to completed image outputs.
        </p>
      </div>

      {/* Main Canvas Interface */}
      <GalleryInterface initialGenerations={generations} artists={artists} />
    </div>
  );
}
