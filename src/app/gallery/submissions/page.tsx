import React from "react";
import { prisma } from "@/lib/prisma";
import PublicSubmissionsGallery from "./PublicSubmissionsGallery";
import Link from "next/link";

export const revalidate = 0; // Force live feed re-render on requests

export default async function PublicSubmissionsGalleryPage() {
  // Query only approved, non-deleted, published drawings
  const submissions = await prisma.themeSubmission.findMany({
    where: {
      isPublishedToGallery: true,
      deletedAt: null,
      effectiveStatus: "accepted",
    },
    include: {
      dailyTheme: {
        select: {
          themeText: true,
          description: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <span>Curated Collection</span>
            <span>•</span>
            <span>User Submissions Showcase</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            🎨 Curated Sketches & Illustration Gallery
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Browse the hand-drawn sketches submitted by community creators for our daily drawing challenges, selected and curated by administrators.
          </p>
        </div>

        {/* Link back to base generated gallery */}
        <Link
          href="/gallery"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-4 py-2 text-xs hover:bg-indigo-100 transition shrink-0"
        >
          🔮 View AI Style Gallery
        </Link>
      </div>

      {/* Main Grid Wrapper */}
      <PublicSubmissionsGallery submissions={submissions} />
    </div>
  );
}
