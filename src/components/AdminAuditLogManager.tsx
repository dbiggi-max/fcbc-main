"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

interface AuditLogLite {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadataJson: any;
  createdAt: Date | string;
}

interface AdminAuditLogManagerProps {
  initialLogs: AuditLogLite[];
  checklist: {
    dataset_image_registered: boolean;
    model_adapter_registered: boolean;
    generation_requested: boolean;
    generation_completed: boolean;
    royalty_event_created: boolean;
    daily_theme_submission_created: boolean;
    daily_theme_submission_validated: boolean;
    theme_submission_saved_to_dataset: boolean;
  };
}

// Inline helper to render custom colored badges based on Action name
function getActionBadgeStyles(action: string): { bg: string; text: string; border: string } {
  const norm = action.toLowerCase();
  if (norm.includes("register") || norm.includes("created")) {
    return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" };
  }
  if (norm.includes("completed") || norm.includes("accepted") || norm.includes("approved")) {
    return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" };
  }
  if (norm.includes("request") || norm.includes("queued")) {
    return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" };
  }
  if (norm.includes("royalty")) {
    return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" };
  }
  if (norm.includes("reject") || norm.includes("failed")) {
    return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" };
  }
  return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-100" };
}

// Extraction helper for the inline short summary column
function getMetadataSummary(meta: any) {
  if (!meta || typeof meta !== "object") return null;

  const summaries: string[] = [];

  // Artist Attribution details
  if (meta.artistId) {
    summaries.push(`Artist ID: ${meta.artistId}`);
  }
  if (meta.artistSlug) {
    summaries.push(`Artist: ${meta.artistSlug}`);
  }

  // Generation details
  if (meta.generationRequestId) {
    summaries.push(`Gen Request: ${meta.generationRequestId}`);
  }
  if (meta.outputImagePath) {
    summaries.push(`Has Output File`);
  }

  // Theme submissions
  if (meta.themeSubmissionId || meta.submissionId) {
    summaries.push(`Submission ID: ${meta.themeSubmissionId || meta.submissionId}`);
  }
  if (meta.validationStatus) {
    summaries.push(`Status: ${meta.validationStatus}`);
  }
  if (meta.clipSimilarityScore !== undefined && meta.clipSimilarityScore !== null) {
    summaries.push(`CLIP Score: ${meta.clipSimilarityScore}`);
  }

  // Dataset tracking
  if (meta.datasetVersionId) {
    summaries.push(`Version: ${meta.datasetVersionId}`);
  }
  if (meta.licenseRecordId) {
    summaries.push(`License: ${meta.licenseRecordId}`);
  }

  // Royalty Event distributions
  if (meta.royaltyAmountCents !== undefined || meta.amountCents !== undefined) {
    const cents = meta.royaltyAmountCents !== undefined ? meta.royaltyAmountCents : meta.amountCents;
    summaries.push(`Amount: ¥${cents} JPY`);
  } else if (meta.amountCents) {
    summaries.push(`Amount: ¥${meta.amountCents} JPY`);
  }

  if (summaries.length === 0) {
    // Fallback representation of any keys
    const keys = Object.keys(meta).slice(0, 3);
    if (keys.length > 0) {
      return `Keys: ${keys.join(", ")}`;
    }
    return "No summarized keys";
  }

  return summaries.join(" | ");
}

export function AdminAuditLogManager({ initialLogs, checklist }: AdminAuditLogManagerProps) {
  // Filters & State tracking
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedEntityType, setSelectedEntityType] = useState("all");

  // Determine unique categories dynamically to populate filter selectors
  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    initialLogs.forEach((log) => set.add(log.action));
    return Array.from(set).sort();
  }, [initialLogs]);

  const uniqueEntityTypes = useMemo(() => {
    const set = new Set<string>();
    initialLogs.forEach((log) => set.add(log.entityType));
    return Array.from(set).sort();
  }, [initialLogs]);

  // Client-side filtering implementation
  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      // 1. Action filter
      if (selectedAction !== "all" && log.action !== selectedAction) {
        return false;
      }

      // 2. Entity Type filter
      if (selectedEntityType !== "all" && log.entityType !== selectedEntityType) {
        return false;
      }

      // 3. Text Search filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const actionMatch = log.action.toLowerCase().includes(query);
        const entityIdMatch = log.entityId?.toLowerCase().includes(query) || false;
        const actorIdMatch = log.actorId?.toLowerCase().includes(query) || false;
        
        let metaMatch = false;
        if (log.metadataJson) {
          try {
            const metaString = JSON.stringify(log.metadataJson).toLowerCase();
            metaMatch = metaString.includes(query);
          } catch (e) {
            // Safe JSON stringify skip
          }
        }

        if (!actionMatch && !entityIdMatch && !actorIdMatch && !metaMatch) {
          return false;
        }
      }

      return true;
    });
  }, [initialLogs, searchQuery, selectedAction, selectedEntityType]);

  // Reset filters wrapper
  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedAction("all");
    setSelectedEntityType("all");
  };

  return (
    <div className="space-y-6">
      
      {/* 2-Column top section: Event Checklist & Navigation Shortcuts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        
        {/* Governance Trail Checklist */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <svg className="h-4.5 w-4.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Important Governance Event Checklist
            </h3>
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
              Telemetry Verification
            </span>
          </div>
          
          <div className="mt-4 grid gap-3 grid-cols-1 md:grid-cols-2">
            
            {/* Checklist items mapping */}
            {[
              { key: "dataset_image_registered", label: "Dataset Image Registered" },
              { key: "model_adapter_registered", label: "Model Adapter Registered" },
              { key: "generation_requested", label: "Generation Requested" },
              { key: "generation_completed", label: "Generation Completed" },
              { key: "royalty_event_created", label: "Royalty Event Created" },
              { key: "daily_theme_submission_created", label: "Daily Theme Submission Created" },
              { key: "daily_theme_submission_validated", label: "Daily Theme Submission Validated" },
              { key: "theme_submission_saved_to_dataset", label: "Theme Submission Saved To Dataset" },
            ].map((item) => {
              const isPresent = (checklist as any)[item.key];
              return (
                <div 
                  key={item.key} 
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold ${
                    isPresent 
                      ? "bg-emerald-50/40 border-emerald-100 text-emerald-800" 
                      : "bg-slate-50 border-slate-100 text-slate-400"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${
                    isPresent 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-slate-200 text-slate-500 border border-slate-300"
                  }`}>
                    {isPresent ? "● Present" : "○ Missing"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demo Guide Shortcut panel */}
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/20 to-white p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-indigo-50 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Platform Demo Guides
            </h3>
            <span className="text-[10px] font-mono text-indigo-500 font-bold">Quick Links</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Need to generate additional governance logs? Trigger full system cycles across different parts of the workspace:
          </p>
          <div className="grid gap-2 text-xs">
            <Link 
              href="/admin/datasets" 
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 transition-all text-slate-700"
            >
              <span>1. Run Museum Dataset Ingestion</span>
              <span className="font-bold">&rarr;</span>
            </Link>
            <Link 
              href="/generate" 
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 transition-all text-slate-700"
            >
              <span>2. Request a LoRA Generation</span>
              <span className="font-bold">&rarr;</span>
            </Link>
            <Link 
              href="/admin/daily-theme" 
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 transition-all text-slate-700"
            >
              <span>3. Review Theme Submission</span>
              <span className="font-bold">&rarr;</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Control filters and search box */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <label htmlFor="search-input" className="sr-only">Search logs</label>
            <div className="relative">
              <input
                id="search-input"
                type="text"
                placeholder="Search across Action, Entity ID, Actor, or Metadata JSON..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter by Action dropdown */}
            <div>
              <label htmlFor="action-filter" className="sr-only">Filter by action</label>
              <select
                id="action-filter"
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="all">All Actions ({uniqueActions.length})</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* Filter by Entity Type dropdown */}
            <div>
              <label htmlFor="entity-filter" className="sr-only">Filter by entity type</label>
              <select
                id="entity-filter"
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="all">All Entity Types ({uniqueEntityTypes.length})</option>
                {uniqueEntityTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Clear filters shortcut */}
            {(searchQuery || selectedAction !== "all" || selectedEntityType !== "all") && (
              <button
                onClick={handleClearFilters}
                className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Reset Filters
              </button>
            )}

          </div>
        </div>

        {/* Counter indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-3 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-600">{filteredLogs.length}</strong> of{" "}
            <strong className="text-slate-600">{initialLogs.length}</strong> events
          </span>
          {filteredLogs.length !== initialLogs.length && (
            <span className="text-indigo-600">Filters are active</span>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4.5">Created Date</th>
                  <th className="px-6 py-4.5">Action Event</th>
                  <th className="px-6 py-4.5">Target Entity</th>
                  <th className="px-6 py-4.5">Actor ID</th>
                  <th className="px-6 py-4.5">Metadata Summary</th>
                  <th className="px-6 py-4.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {filteredLogs.map((log) => {
                  const badgeStyles = getActionBadgeStyles(log.action);
                  const dateString = new Date(log.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                  const timeString = new Date(log.createdAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZoneName: "short",
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Created Date */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{dateString}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{timeString}</span>
                      </td>

                      {/* Action Event */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeStyles.bg} ${badgeStyles.text} ring-slate-500/10`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td className="px-6 py-4.5">
                        <span className="text-xs font-bold text-slate-800 uppercase bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-mono">
                          {log.entityType}
                        </span>
                        {log.entityId ? (
                          <span className="text-[10px] text-slate-400 block font-mono mt-1 truncate max-w-[120px]" title={log.entityId}>
                            ID: {log.entityId}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic block mt-1">No ID referenced</span>
                        )}
                      </td>

                      {/* Actor ID */}
                      <td className="px-6 py-4.5 whitespace-nowrap text-xs font-mono text-slate-500">
                        {log.actorId ? (
                          <span className="text-slate-800 font-medium" title={log.actorId}>
                            {log.actorId}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">N/A - Anonymous</span>
                        )}
                      </td>

                      {/* Metadata Summary */}
                      <td className="px-6 py-4.5 text-xs">
                        {log.metadataJson ? (
                          <p className="font-mono text-slate-700 leading-normal max-w-sm line-clamp-3">
                            {getMetadataSummary(log.metadataJson)}
                          </p>
                        ) : (
                          <span className="text-slate-300 italic">No metadata payload</span>
                        )}
                      </td>

                      {/* Expandable JSON Details */}
                      <td className="px-6 py-4.5 text-right whitespace-nowrap">
                        {log.metadataJson ? (
                          <details className="text-left select-none inline-block">
                            <summary className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer hover:underline uppercase tracking-wide">
                              Raw JSON
                            </summary>
                            <div className="absolute right-6 mt-2 z-10 w-96 rounded-lg border border-slate-200 bg-slate-900 p-4 shadow-xl text-left select-text">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-700 mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                  Metadata Payload
                                </span>
                                <span className="text-[10px] text-indigo-400 font-mono font-bold">
                                  RSC Trace
                                </span>
                              </div>
                              <pre className="overflow-auto text-[10px] font-mono text-indigo-300 max-h-56 leading-relaxed whitespace-pre-wrap">
                                {JSON.stringify(log.metadataJson, null, 2)}
                              </pre>
                            </div>
                          </details>
                        ) : (
                          <span className="text-xs text-slate-300 italic">None</span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">No matching audit events</h3>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting your text query or search category filters to find older records.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
