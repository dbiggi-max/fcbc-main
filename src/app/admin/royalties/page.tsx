import React from "react";
import { prisma } from "@/lib/prisma";
import { RoyaltyEvent, Artist, GenerationRequest } from "@prisma/client";
import { AdminTableHeader, StatusBadge, EmptyState } from "@/components/admin-helpers";

export const revalidate = 0; // Dynamic rendering, ensure fresh billing ledger on each visit

type RoyaltyWithRelations = RoyaltyEvent & {
  artist: Artist;
  generationRequest: GenerationRequest;
};

export default async function RoyaltiesAdminPage() {
  let royaltyEvents: RoyaltyWithRelations[] = [];
  let artists: (Artist & { royaltyEvents: RoyaltyEvent[] })[] = [];
  let loadError: unknown = null;

  try {
    royaltyEvents = await prisma.royaltyEvent.findMany({
      include: {
        artist: true,
        generationRequest: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    artists = await prisma.artist.findMany({
      include: {
        royaltyEvents: true,
      },
    });
  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    console.error("Failed to query royalties administrative records:", loadError);
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm text-red-950">
          <div className="flex items-center gap-3 text-red-800">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-base font-bold">Billing Ledger Query Error</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            Could not retrieve simulated royalty ledgers from the database.
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

  // Calculate Aggregates in memory (Type-Safe & Instant)
  const totalEventsCount = royaltyEvents.length;
  const totalJPYAmount = royaltyEvents.reduce((acc, ev) => acc + ev.amountCents, 0);

  const artistStandings = artists
    .map((artist) => {
      const eventsCount = artist.royaltyEvents.length;
      const totalAmount = artist.royaltyEvents.reduce((acc, ev) => acc + ev.amountCents, 0);
      return {
        id: artist.id,
        displayName: artist.displayName,
        slug: artist.slug,
        eventsCount,
        totalAmount,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const activeArtistsCount = artistStandings.filter((a) => a.eventsCount > 0).length;

  return (
    <div className="p-6 md:p-8 space-y-8 text-slate-900">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Royalty Events</h1>
        <p className="mt-1 text-sm text-slate-500 leading-relaxed">
          Monitor and review simulated billing ledgers and royalty credits credited to participating artist styles.
        </p>
      </div>

      {/* 1. Summary Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Events */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow">
          <div className="h-12 w-12 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Royalty Events</span>
            <span className="text-2xl font-black text-slate-800 block mt-0.5">{totalEventsCount} Events</span>
          </div>
        </div>

        {/* Cumulative JPY Credits */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow">
          <div className="h-12 w-12 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="text-lg font-black font-mono">¥</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Simulated JPY Credits</span>
            <span className="text-2xl font-black text-slate-800 block mt-0.5">¥{totalJPYAmount} JPY</span>
          </div>
        </div>

        {/* Active Enrolled Artists */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow">
          <div className="h-12 w-12 rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Credited Artist Styles</span>
            <span className="text-2xl font-black text-slate-800 block mt-0.5">{activeArtistsCount} Enrolled</span>
          </div>
        </div>
      </div>

      {/* 2. Middle Section: Leaderboard + Table Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Aggregated Standings List (occupies 1 column) */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <svg className="h-5 w-5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Artist Standing Leaderboard
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Comparison of total accumulated style generations and simulated royalty events.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              {artistStandings.map((ast, idx) => {
                const rankColor =
                  idx === 0 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200";

                return (
                  <div
                    key={ast.id}
                    className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 flex items-center justify-between transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-6 w-6 rounded-full border text-[11px] font-bold flex items-center justify-center ${rankColor}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block leading-tight">{ast.displayName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">slug: {ast.slug}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-800 block">¥{ast.totalAmount} JPY</span>
                      <span className="text-[9px] font-mono text-slate-400 block">{ast.eventsCount} events</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-slate-100 pt-4 text-[11px] text-slate-500 leading-relaxed">
              * Royalties are simulated at ¥50 JPY per complete generation request. Rates and parameters can be customized dynamically in future payment engine integration steps.
            </div>
          </div>
        </div>

        {/* Right Side: Ledger Table (occupies 2 columns) */}
        <div className="lg:col-span-2">
          <AdminTableHeader
            title="Royalty Transaction Ledger"
            subtitle="Immutable event log showing credited values per style render."
            badgeCount={royaltyEvents.length}
          />

          {royaltyEvents.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Transaction Date</th>
                      <th className="px-6 py-4">Credited Artist</th>
                      <th className="px-6 py-4">Generation Request</th>
                      <th className="px-6 py-4">Value</th>
                      <th className="px-6 py-4">Currency</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm text-slate-600">
                    {royaltyEvents.map((ev) => {
                      const formattedDate = new Date(ev.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      });

                      return (
                        <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Date */}
                          <td className="whitespace-nowrap px-6 py-4.5 font-medium text-slate-800">
                            {formattedDate}
                          </td>

                          {/* Artist */}
                          <td className="whitespace-nowrap px-6 py-4.5 font-bold text-slate-900">
                            {ev.artist.displayName}
                          </td>

                          {/* Request Prompt */}
                          <td className="px-6 py-4.5 max-w-xs">
                            <div className="text-xs text-slate-700 font-semibold line-clamp-1 truncate" title={ev.generationRequest.prompt}>
                              {ev.generationRequest.prompt}
                            </div>
                            <span className="font-mono text-[9px] text-slate-400 select-all block mt-0.5">
                              ID: {ev.generationRequestId}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="whitespace-nowrap px-6 py-4.5 font-black text-slate-900">
                            ¥{ev.amountCents}
                          </td>

                          {/* Currency */}
                          <td className="whitespace-nowrap px-6 py-4.5 uppercase font-mono text-xs text-slate-400">
                            {ev.currency}
                          </td>

                          {/* Status */}
                          <td className="whitespace-nowrap px-6 py-4.5 text-right">
                            <StatusBadge status={ev.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                message="No billing events recorded"
                subtitle="Style generations executed in the Generator will automatically invoke simulated payments."
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
