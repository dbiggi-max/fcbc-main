import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Artist, ModelAdapter, GenerationRequest, RoyaltyEvent, ThemeSubmission, DailyTheme, AuditLog } from "@prisma/client";
import { AdminMetricCard, StatusBadge } from "@/components/admin-helpers";
import { requireAdmin } from "@/lib/security";

export const revalidate = 0; // Dynamic data loading

export default async function AdminPage() {
  await requireAdmin();
  let counts: [number, number, number, number, number, number, number, number, number, number, number] | null = null;
  let latestAuditLog: AuditLog | null = null;
  let recentArtists: Artist[] = [];
  let recentAdapters: (ModelAdapter & { artist: Artist })[] = [];
  let recentCompletedGenerations: (GenerationRequest & { artist: Artist; royaltyEvent: RoyaltyEvent | null })[] = [];
  let recentThemeSubmissions: (ThemeSubmission & { dailyTheme: DailyTheme; artist: Artist | null })[] = [];
  let loadError: unknown = null;

  try {
    const [
      artistCount,
      licenseCount,
      datasetVersionCount,
      datasetImageCount,
      modelAdapterCount,
      generationCount,
      royaltyCount,
      submissionCount,
      auditLogCount,
      savedSubmissionCount,
      completedGenerationCount,
      latestLog,
    ] = await Promise.all([
      prisma.artist.count(),
      prisma.consentOrLicenseRecord.count(),
      prisma.datasetVersion.count(),
      prisma.datasetImage.count(),
      prisma.modelAdapter.count(),
      prisma.generationRequest.count(),
      prisma.royaltyEvent.count(),
      prisma.themeSubmission.count(),
      prisma.auditLog.count(),
      prisma.themeSubmission.count({ where: { savedToDataset: true } }),
      prisma.generationRequest.count({ where: { status: "completed" } }),
      prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

    counts = [
      artistCount,
      licenseCount,
      datasetVersionCount,
      datasetImageCount,
      modelAdapterCount,
      generationCount,
      royaltyCount,
      submissionCount,
      auditLogCount,
      savedSubmissionCount,
      completedGenerationCount,
    ];

    latestAuditLog = latestLog;

    recentArtists = await prisma.artist.findMany({
      take: 5,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    recentAdapters = await prisma.modelAdapter.findMany({
      take: 5,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        artist: true,
      },
    });

    recentCompletedGenerations = await prisma.generationRequest.findMany({
      where: {
        status: "completed",
        outputImagePath: { not: null },
      },
      take: 5,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        artist: true,
        royaltyEvent: true,
      },
    });

    recentThemeSubmissions = await prisma.themeSubmission.findMany({
      take: 5,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        dailyTheme: true,
        artist: true,
      },
    });
  } catch (error) {
    loadError = error;
  }

  // Handle error state outside of try/catch
  if (loadError) {
    console.error("Prisma load error in /admin page:", loadError);
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
            The database backend could not be queried. Please verify that your database connection string in `.env` is configured correctly, and migrations have been executed.
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

  // Render main page outside of try/catch
  const [
    artistCount,
    licenseCount,
    datasetVersionCount,
    datasetImageCount,
    modelAdapterCount,
    generationCount,
    royaltyCount,
    submissionCount,
    auditLogCount,
    savedSubmissionCount,
    completedGenerationCount,
  ] = counts || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Admin Overview
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-3xl">
          Real-time telemetry and management controls for the FCBC repository. 
          Review active artists, verify dataset versions, inspect deployed adapters, 
          and monitor royalty distributions.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          title="Total Artists"
          value={artistCount}
          description="Onboarded creator and museum profiles"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <AdminMetricCard
          title="License Records"
          value={licenseCount}
          description="Active legal consent & rights agreements"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <AdminMetricCard
          title="Dataset Versions"
          value={datasetVersionCount}
          description="Distinct style training iterations"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <AdminMetricCard
          title="Dataset Images"
          value={datasetImageCount}
          description="Verified high-quality style source assets"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <AdminMetricCard
          title="Model Adapters"
          value={modelAdapterCount}
          description="Registered and deployed style weights"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <AdminMetricCard
          title="Generations"
          value={generationCount}
          description="Triggered image inference sessions"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <AdminMetricCard
          title="Royalty Events"
          value={royaltyCount}
          description="Simulated attribution payout transactions"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <AdminMetricCard
          title="Theme Submissions"
          value={submissionCount}
          description="Creator uploads to daily themes"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
        />
      </div>

      {/* Governance & Traceability Panel */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Governance & Compliance Summary
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Active verification metrics tracking legal consent, dataset updates, royalties, and administrative audit trails.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href="/admin/audit-logs"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white hover:bg-indigo-700 hover:shadow-xs transition-all"
            >
              Examine full audit trail &rarr;
            </Link>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 mt-5">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Audit Events</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{auditLogCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Logged actions</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed Generations</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{completedGenerationCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Inference requests</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submissions Ingested</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{savedSubmissionCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Theme entries in datasets</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Simulated Royalties</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{royaltyCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Attributed payouts</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latest Audit Activity</p>
            {latestAuditLog ? (
              <div className="mt-1">
                <p className="text-xs font-black text-indigo-700 truncate" title={latestAuditLog.action}>
                  {latestAuditLog.action}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {new Date(latestAuditLog.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-400 italic mt-1">None registered</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No logged events yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Recent Artists */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Artists</h2>
            <Link
              href="/admin/artists"
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 hover:underline transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            {recentArtists.length > 0 ? (
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5">Artist</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {recentArtists.map((artist) => (
                    <tr key={artist.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-medium text-slate-900">{artist.displayName}</td>
                      <td className="py-3 capitalize">{artist.type}</td>
                      <td className="py-3 text-right">
                        <StatusBadge status={artist.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No artists registered yet.</p>
            )}
          </div>
        </div>

        {/* Recent Adapters */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Adapters</h2>
            <Link
              href="/admin/adapters"
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 hover:underline transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            {recentAdapters.length > 0 ? (
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5">Adapter</th>
                    <th className="py-2.5">Artist Style</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {recentAdapters.map((adapter) => (
                    <tr key={adapter.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-medium text-slate-900">{adapter.adapterName}</td>
                      <td className="py-3">{adapter.artist.displayName}</td>
                      <td className="py-3 text-right">
                        <StatusBadge status={adapter.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No model adapters deployed yet.</p>
            )}
          </div>
        </div>

        {/* Recent Completed Generations (Full Width Section) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Recent Completed Generations
            </h2>
            <Link
              href="/gallery"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
            >
              Open gallery showroom &rarr;
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            {recentCompletedGenerations.length > 0 ? (
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5">Render Preview</th>
                    <th className="py-2.5">Artist Style</th>
                    <th className="py-2.5">Prompt Context</th>
                    <th className="py-2.5">Simulated Royalty</th>
                    <th className="py-2.5 text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {recentCompletedGenerations.map((gen) => {
                    const dateStr = new Date(gen.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "UTC",
                    });
                    return (
                      <tr key={gen.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3">
                          {gen.outputImagePath ? (
                            <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 relative bg-slate-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={gen.outputImagePath}
                                alt="Dashboard thumbnail"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">No image</span>
                          )}
                        </td>
                        <td className="py-3 font-bold text-slate-900">{gen.artist.displayName}</td>
                        <td className="py-3 max-w-xs md:max-w-md">
                          <p className="text-xs font-medium text-slate-700 truncate line-clamp-1" title={gen.prompt}>
                            {gen.prompt}
                          </p>
                        </td>
                        <td className="py-3">
                          {gen.royaltyEvent ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">
                              ¥{gen.royaltyEvent.amountCents} {gen.royaltyEvent.currency} (Simulated)
                            </span>
                          ) : (
                            <span className="text-slate-300 italic text-xs">No payment</span>
                          )}
                        </td>
                        <td className="py-3 text-right text-slate-500 text-xs font-mono">{dateStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-slate-500">No completed generations found yet.</p>
                <Link
                  href="/generate"
                  className="inline-flex items-center gap-1.5 rounded bg-indigo-600 text-white font-bold text-xs uppercase px-3 py-1.5 hover:bg-indigo-700"
                >
                  Generate first style render
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Theme Submissions (Full Width Section) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 text-left">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Recent Daily Theme Submissions
            </h2>
            <Link
              href="/admin/daily-theme"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
            >
              Verify candidate assets &rarr;
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            {recentThemeSubmissions.length > 0 ? (
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5">Preview</th>
                    <th className="py-2.5">Challenge Theme</th>
                    <th className="py-2.5">Image Location / Submitter</th>
                    <th className="py-2.5">Validation</th>
                    <th className="py-2.5 text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {recentThemeSubmissions.map((sub) => {
                    const dateStr = new Date(sub.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "UTC",
                    });
                    // Do not render data URLs as text. Apart from making the HTML
                    // enormous, a stale RSC/navigation response can otherwise
                    // reconcile the full data URL against this shortened value and
                    // produce a hydration mismatch.
                    const displayPath = sub.imagePath.startsWith("data:")
                      ? "Embedded image (Base64)"
                      : sub.imagePath;
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3">
                          <div className="h-10 w-10 rounded overflow-hidden border border-slate-200 relative bg-slate-100 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sub.imagePath}
                              alt="Submission thumbnail"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="py-3 font-bold text-slate-900 max-w-[150px] truncate">
                          &ldquo;{sub.dailyTheme.themeText}&rdquo;
                        </td>
                        <td className="py-3 max-w-xs md:max-w-md">
                          <p className="text-xs font-semibold text-slate-700 truncate" title={sub.promptOrCaption || ""}>
                            {sub.promptOrCaption || <span className="italic text-slate-300 font-normal">No caption</span>}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
                            Path: {displayPath} {sub.userId ? `| User: ${sub.userId}` : ""}
                          </p>
                        </td>
                        <td className="py-3">
                          <div className="space-y-1 text-left">
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] uppercase font-mono font-bold ${
                              sub.validationStatus === "pending"
                                ? "bg-amber-50 text-amber-800 border border-amber-100"
                                : sub.validationStatus === "accepted"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                : sub.validationStatus === "needs_review"
                                ? "bg-indigo-50 text-indigo-800 border border-indigo-100"
                                : "bg-rose-50 text-rose-800 border border-rose-100"
                            }`}>
                              {sub.validationStatus}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 block">
                              {sub.clipSimilarityScore !== null ? `Similarity: ${sub.clipSimilarityScore}` : "CLIP Similarity: null"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-slate-500 text-xs font-mono">{dateStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-slate-500">No daily theme submissions found yet.</p>
                <Link
                  href="/daily-theme"
                  className="inline-flex items-center gap-1.5 rounded bg-indigo-600 text-white font-bold text-xs uppercase px-3 py-1.5 hover:bg-indigo-700"
                >
                  Join drawing challenge
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
