import React from "react";
import { prisma } from "@/lib/prisma";
import { Artist } from "@prisma/client";
import { AdminTableHeader, StatusBadge, EmptyState } from "@/components/admin-helpers";
import { requireAdmin } from "@/lib/security";
import { approveArtistProfile, rejectArtistProfile } from "./actions";
import { revalidatePath } from "next/cache";

export const revalidate = 0; // Dynamic data loading

type ArtistWithCounts = Artist & {
  _count: {
    licenseRecords: number;
    datasetVersions: number;
    modelAdapters: number;
  };
};

export default async function ArtistsPage() {
  // 1. Double protect with backend requireAdmin check
  await requireAdmin();

  let artists: ArtistWithCounts[] = [];
  let loadError: unknown = null;

  try {
    artists = await prisma.artist.findMany({
      include: {
        _count: {
          select: {
            licenseRecords: true,
            datasetVersions: true,
            modelAdapters: true,
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

  // Handle Approve/Reject Form Handlers
  async function handleApprove(formData: FormData) {
    "use server";
    const artistId = formData.get("artistId") as string;
    if (artistId) {
      await approveArtistProfile(artistId);
      revalidatePath("/admin/artists");
    }
  }

  async function handleReject(formData: FormData) {
    "use server";
    const artistId = formData.get("artistId") as string;
    if (artistId) {
      await rejectArtistProfile(artistId);
      revalidatePath("/admin/artists");
    }
  }

  if (loadError) {
    console.error("Prisma load error in /admin/artists page:", loadError);
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
            Could not retrieve artist database profiles. Please check database logs and connectivity.
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
    <div className="p-6 md:p-8 space-y-6">
      {/* Top Note / Warning Box */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 text-indigo-900 shadow-sm flex gap-3">
        <svg
          className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <p className="text-xs font-semibold leading-relaxed">
          Consensual Style Management: New registrations require explicit administrator verification approval before their signature can trigger style dataset compilations, model training, or simulated royalty accruals.
        </p>
      </div>

      {/* Section Header */}
      <AdminTableHeader
        title="Onboarded Artists"
        subtitle="Profiles, active registration status, and legal consent mappings."
        badgeCount={artists.length}
      />

      {/* Table list */}
      {artists.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Display Name</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Verification</th>
                  <th className="px-6 py-4 text-center">Datasets</th>
                  <th className="px-6 py-4 text-center">Adapters</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-600">
                {artists.map((artist) => {
                  const formattedDate = new Date(artist.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

                  const isPending = artist.verificationStatus === "PENDING" || artist.verificationStatus === "pending_verification";
                  const isApproved = artist.verificationStatus === "APPROVED";
                  const isRejected = artist.verificationStatus === "REJECTED";

                  return (
                    <tr key={artist.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4.5 font-semibold text-slate-900">
                        {artist.displayName}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4.5 font-mono text-xs text-slate-500">
                        {artist.slug}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4.5">
                        {isPending && (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/10 animate-pulse">
                            Pending Approval
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/10">
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4.5 text-center font-medium text-slate-800">
                        {artist._count.datasetVersions}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4.5 text-center font-medium text-slate-800">
                        {artist._count.modelAdapters}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4.5 text-slate-500">
                        {formattedDate}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4.5 text-right space-x-2">
                        {isPending ? (
                          <div className="inline-flex gap-2">
                            <form action={handleApprove}>
                              <input type="hidden" name="artistId" value={artist.id} />
                              <button
                                type="submit"
                                className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            </form>
                            <form action={handleReject}>
                              <input type="hidden" name="artistId" value={artist.id} />
                              <button
                                type="submit"
                                className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded hover:bg-rose-100 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No action needed</span>
                        )}
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
          message="No Artists Registered"
          subtitle="Click to invite style creators and onboard consensual AI profiles."
        />
      )}
    </div>
  );
}
