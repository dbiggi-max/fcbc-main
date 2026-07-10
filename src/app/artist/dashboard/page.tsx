import { prisma } from "@/lib/prisma";
import { requireArtistOrAdmin } from "@/lib/security";
import Link from "next/link";
import { redirect } from "next/navigation";

export const revalidate = 0; // Dynamic route

export default async function ArtistDashboardPage() {
  // 1. Enforce that only users with role ARTIST or ADMIN can enter
  const user = await requireArtistOrAdmin();

  // 2. Fetch user's artist profile
  const artist = await prisma.artist.findFirst({
    where: { userId: user.id },
  });

  if (!artist) {
    // If they have the role but no profile (edge case), redirect to registration
    redirect("/artist/register");
  }

  // 3. Retrieve non-deleted theme submissions linked to this artist profile
  const linkedSubmissions = await prisma.themeSubmission.findMany({
    where: {
      artistId: artist.id,
      deletedAt: null, // Active views only
    },
    include: {
      dailyTheme: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalSubmissions = linkedSubmissions.length;
  const acceptedSubmissions = linkedSubmissions.filter((s) => s.effectiveStatus === "accepted" || s.validationStatus === "accepted").length;

  const isPending = artist.verificationStatus === "pending_verification";
  const isVerified = artist.verificationStatus === "verified";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Artist Portal: {artist.displayName}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-mono">
            Style Slug: <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-800">{artist.slug}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isVerified ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              🟢 Verified Style Partner
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
              🟡 Verification Pending
            </span>
          )}
        </div>
      </div>

      {/* Safety and Verification Warnings */}
      {isPending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-6 space-y-2">
          <h3 className="text-sm font-bold text-amber-900 uppercase">🛡️ Pre-Verification Quarantine active</h3>
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            Your custom style profile is currently undergoing internal review by our admin operations team. In accordance with our <strong>Consensual Art Commitment</strong>, your style is quarantined and cannot be used for production LoRA style training, public dataset compilations, public artist pages, or royalty-bearing generation models until verification is explicitly approved.
          </p>
          <div className="text-[10px] text-amber-600 pt-1">
            Verification requested on: {new Date(artist.verificationRequestedAt || artist.createdAt).toLocaleString()}
          </div>
        </div>
      )}

      {isVerified && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-6 space-y-2">
          <h3 className="text-sm font-bold text-emerald-900 uppercase">✨ Active verified status</h3>
          <p className="text-xs text-emerald-800 font-medium leading-relaxed">
            Congratulations! Your style signature is fully approved. Approved drawings with your style link are eligible to compile verified artist style datasets, train consensual models, and accrue royalties in simulated generation loops.
          </p>
        </div>
      )}

      {/* Metrics overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Linked Drawings</span>
          <span className="text-2xl font-black text-slate-900 mt-2">{totalSubmissions}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved Style Renders</span>
          <span className="text-2xl font-black text-emerald-600 mt-2">{acceptedSubmissions}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accrued Royalties</span>
          <span className="text-2xl font-black text-slate-900 mt-2">$0.00 <span className="text-xs text-slate-400 normal-case font-normal">(Simulation)</span></span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Authorized LoRAs</span>
          <span className="text-2xl font-black text-slate-300 mt-2">None</span>
        </div>
      </div>

      {/* Linked Submissions table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Ingested Style Drawings</h2>
          <span className="font-mono text-xs text-slate-400 font-bold">TOTAL: {totalSubmissions}</span>
        </div>

        {linkedSubmissions.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <span className="text-3xl">🎨</span>
            <h3 className="text-sm font-bold text-slate-800">No ingested style drawings</h3>
            <p className="text-xs text-slate-400 leading-normal">
              You haven't submitted any drawings linked to your style signature yet. Open the Daily Theme panel and choose your style profile from the dropdown before submitting!
            </p>
            <Link
              href="/daily-theme"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all cursor-pointer"
            >
              Draw Now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Preview</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Theme / Caption</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Ingestion Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Dataset Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {linkedSubmissions.map((sub) => {
                  const status = sub.effectiveStatus || sub.validationStatus;
                  const isAccepted = status === "accepted";
                  const isRejected = status === "rejected";
                  const isBorderline = status === "borderline";

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-10 w-12 rounded border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sub.imagePath}
                            alt="Drawing preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-800">{sub.dailyTheme.themeText}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5 max-w-xs truncate" title={sub.promptOrCaption || ""}>
                          {sub.promptOrCaption || "No caption"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-500">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isAccepted && (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/10">
                            Rejected
                          </span>
                        )}
                        {isBorderline && (
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/10">
                            Borderline Review
                          </span>
                        )}
                        {status === "pending" && (
                          <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-600/10 animate-pulse">
                            Processing
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sub.datasetApprovalStatus === "approved" ? (
                          <span className="inline-flex items-center rounded bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                            In Dataset
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Excluded</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
