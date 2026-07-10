"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  moderationActionSubmit, 
  moderationPublishAction, 
  moderationRevalidateAction 
} from "./actions";

interface ValidationAttempt {
  id: string;
  triggerSource: string;
  provider: string;
  decision: string;
  themeMatchScore: number;
  qualityScore: number;
  simplicityScore: number;
  effortScore: number;
  spamScore: number;
  isLowEffort: boolean;
  isOffTheme: boolean;
  isObviousSpam: boolean;
  rejectionCodes: string[];
  modelName: string;
  modelVersion: string;
  rawResponseJson: any;
  thresholdSnapshot: any;
  createdAt: string | Date;
}

interface Submission {
  id: string;
  dailyThemeId: string;
  userId: string | null;
  artistId: string | null;
  imagePath: string;
  promptOrCaption: string | null;
  validationStatus: string;
  effectiveStatus: string | null;
  overriddenByAdmin: boolean;
  adminOverrideStatus: string | null;
  adminOverrideReason: string | null;
  adminOverrideAt: string | Date | null;
  adminOverrideBy: string | null;
  isPublishedToGallery: boolean;
  publishedAt: string | Date | null;
  publishedByAdminId: string | null;
  unpublishedAt: string | Date | null;
  galleryVisibility: string;
  createdAt: string | Date;
  deletedAt: string | Date | null;
  dailyTheme: {
    id: string;
    themeText: string;
    description: string | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  validationAttempts: ValidationAttempt[];
}

interface ModerationWorkspaceProps {
  initialSubmissions: any[];
}

export default function ModerationWorkspace({ initialSubmissions }: ModerationWorkspaceProps) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [activeTab, setActiveTab] = useState<"accepted" | "borderline" | "rejected" | "spam">("borderline");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedIndex, setFocusedIdex] = useState<number>(-1);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  
  // Modals / Overlays States
  const [isRevalidateModalOpen, setIsRevalidateModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Filter submissions by tab status
  const filteredSubmissions = submissions.filter((sub) => {
    const status = sub.effectiveStatus || sub.validationStatus;
    if (activeTab === "accepted") return status === "accepted";
    if (activeTab === "borderline") return status === "borderline" || status === "pending";
    if (activeTab === "rejected") return status === "rejected";
    if (activeTab === "spam") return status === "spam";
    return false;
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Keyboard Navigation & Shortcuts handler
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in inputs or textareas
      const activeEl = document.activeElement;
      if (
        activeEl && 
        (activeEl.tagName === "INPUT" || 
         activeEl.tagName === "TEXTAREA" || 
         activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (filteredSubmissions.length === 0) return;

      switch (e.key) {
        // Arrow navigation
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          setFocusedIdex((prev) => (prev < filteredSubmissions.length - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIdex((prev) => (prev > 0 ? prev - 1 : 0));
          break;

        // Selection toggling
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < filteredSubmissions.length) {
            const id = filteredSubmissions[focusedIndex].id;
            setSelectedIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            );
          }
          break;

        // Moderation Shortcuts
        case "a":
        case "A":
          e.preventDefault();
          if (selectedIds.length > 0) {
            await handleModeration("accepted");
          } else if (focusedIndex >= 0) {
            setSelectedIds([filteredSubmissions[focusedIndex].id]);
            await handleModeration("accepted");
          }
          break;

        case "r":
        case "R":
          e.preventDefault();
          if (selectedIds.length > 0) {
            await handleModeration("rejected");
          } else if (focusedIndex >= 0) {
            setSelectedIds([filteredSubmissions[focusedIndex].id]);
            await handleModeration("rejected");
          }
          break;

        case "s":
        case "S":
          e.preventDefault();
          if (selectedIds.length > 0) {
            await handleModeration("spam");
          } else if (focusedIndex >= 0) {
            setSelectedIds([filteredSubmissions[focusedIndex].id]);
            await handleModeration("spam");
          }
          break;

        case "p":
        case "P":
          e.preventDefault();
          if (selectedIds.length > 0) {
            await handlePublishing(true);
          } else if (focusedIndex >= 0) {
            setSelectedIds([filteredSubmissions[focusedIndex].id]);
            await handlePublishing(true);
          }
          break;

        case "u":
        case "U":
          e.preventDefault();
          if (selectedIds.length > 0) {
            await handlePublishing(false);
          } else if (focusedIndex >= 0) {
            setSelectedIds([filteredSubmissions[focusedIndex].id]);
            await handlePublishing(false);
          }
          break;

        case "v":
        case "V":
          e.preventDefault();
          if (selectedIds.length > 0) {
            setIsRevalidateModalOpen(true);
          } else if (focusedIndex >= 0) {
            setSelectedIds([filteredSubmissions[focusedIndex].id]);
            setIsRevalidateModalOpen(true);
          }
          break;

        case "Escape":
          e.preventDefault();
          setSelectedIds([]);
          setFocusedIdex(-1);
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredSubmissions, focusedIndex, selectedIds]);

  // Bulk Actions
  const handleSelectAll = () => {
    const allFilteredIds = filteredSubmissions.map((sub) => sub.id);
    const areAllSelected = allFilteredIds.every((id) => selectedIds.includes(id));

    if (areAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleModeration = async (status: "accepted" | "rejected" | "spam" | "borderline") => {
    if (selectedIds.length === 0) return;
    setIsSubmittingAction(true);

    try {
      const result = await moderationActionSubmit(selectedIds, status, overrideReason);
      if (result.success) {
        showToast(
          `Successfully moderated ${result.successCount} submission(s) as ${status.toUpperCase()}.`,
          "success"
        );
        
        // Optimistically update status in state
        setSubmissions((prev) =>
          prev.map((sub) => {
            if (selectedIds.includes(sub.id)) {
              return {
                ...sub,
                effectiveStatus: status,
                validationStatus: status,
                overriddenByAdmin: true,
                adminOverrideStatus: status,
                adminOverrideReason: overrideReason || "Admin override",
                adminOverrideAt: new Date().toISOString(),
              };
            }
            return sub;
          })
        );

        setSelectedIds([]);
        setOverrideReason("");
        setSelectedSubmission(null);
      } else {
        showToast("Failed to submit moderation override.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An unexpected error occurred.", "error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handlePublishing = async (publish: boolean) => {
    if (selectedIds.length === 0) return;
    setIsSubmittingAction(true);

    try {
      const result = await moderationPublishAction(selectedIds, publish);
      if (result.success) {
        let msg = `Successfully ${publish ? "published" : "unpublished"} ${result.successCount} item(s).`;
        if (result.skippedCount > 0) {
          msg += ` Skipped ${result.skippedCount} non-approved or deleted item(s).`;
        }
        showToast(msg, result.successCount > 0 ? "success" : "info");

        // Optimistically update publishing state
        setSubmissions((prev) =>
          prev.map((sub) => {
            if (selectedIds.includes(sub.id) && !sub.deletedAt && (publish ? sub.effectiveStatus === "accepted" || sub.validationStatus === "accepted" : true)) {
              return {
                ...sub,
                isPublishedToGallery: publish,
                publishedAt: publish ? new Date().toISOString() : null,
                galleryVisibility: publish ? "public" : "private",
              };
            }
            return sub;
          })
        );

        setSelectedIds([]);
        setSelectedSubmission(null);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update publishing status.", "error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleManualRevalidate = async () => {
    if (selectedIds.length === 0) return;
    setIsRevalidateModalOpen(false);
    setIsSubmittingAction(true);

    showToast("Starting manual revalidation in the background...", "info");

    try {
      const result = await moderationRevalidateAction(selectedIds);
      if (result.success) {
        let msg = `Completed manual revalidation: ${result.successCount} succeeded.`;
        if (result.failedCount > 0) {
          msg += ` ${result.failedCount} validation call(s) failed.`;
        }
        showToast(msg, result.failedCount > 0 ? "error" : "success");

        // Reload the workspace or simply refresh the submissions list
        // For security and exact states, we should just let Next.js revalidatePath do its work, but let's notify the user to refresh or trigger a local reload if desired
        window.location.reload();
      }
    } catch (err: any) {
      showToast(err.message || "Manual revalidation pipeline failed.", "error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      {/* Dynamic Toast System */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-xl transition-all duration-300 border ${
          toast.type === "success" ? "bg-emerald-950 border-emerald-500/30 text-emerald-200" :
          toast.type === "error" ? "bg-rose-950 border-rose-500/30 text-rose-200" :
          "bg-blue-950 border-blue-500/30 text-blue-200"
        }`}>
          <div className={`h-2.5 w-2.5 rounded-full ${
            toast.type === "success" ? "bg-emerald-400 animate-ping" :
            toast.type === "error" ? "bg-rose-400 animate-ping" :
            "bg-blue-400 animate-ping"
          }`} />
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Header Panel */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            🎨 Admin Moderation Workspace
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              Phase 3 Live
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review submissions, calibrate thresholds, override decisions, and manage gallery publications safely.
          </p>
        </div>

        {/* Global Stats Counter Card */}
        <div className="grid grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl backdrop-blur-md">
          <div className="text-center px-2">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-lg font-bold text-slate-200">{submissions.length}</p>
          </div>
          <div className="text-center px-2 border-l border-slate-800">
            <p className="text-xs text-emerald-400">Approved</p>
            <p className="text-lg font-bold text-emerald-400">
              {submissions.filter(s => (s.effectiveStatus || s.validationStatus) === "accepted").length}
            </p>
          </div>
          <div className="text-center px-2 border-l border-slate-800">
            <p className="text-xs text-amber-400">Review</p>
            <p className="text-lg font-bold text-amber-400">
              {submissions.filter(s => (s.effectiveStatus || s.validationStatus) === "borderline" || (s.effectiveStatus || s.validationStatus) === "pending").length}
            </p>
          </div>
          <div className="text-center px-2 border-l border-slate-800">
            <p className="text-xs text-rose-400">Rejected</p>
            <p className="text-lg font-bold text-rose-400">
              {submissions.filter(s => (s.effectiveStatus || s.validationStatus) === "rejected").length}
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main Moderation View (3 Columns) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Tabs Navigator */}
          <div className="flex border-b border-slate-800 gap-1 bg-slate-900/40 p-1.5 rounded-lg">
            {(["borderline", "accepted", "rejected", "spam"] as const).map((tab) => {
              const count = submissions.filter((s) => {
                const stat = s.effectiveStatus || s.validationStatus;
                if (tab === "borderline") return stat === "borderline" || stat === "pending";
                return stat === tab;
              }).length;

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSelectedIds([]);
                    setFocusedIdex(-1);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  <span className="capitalize">{tab === "borderline" ? "NEEDS REVIEW" : tab}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab ? "bg-slate-700 text-slate-100" : "bg-slate-950 text-slate-400"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Bulk Panel (Sticky when elements are selected) */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-indigo-950/80 border border-indigo-500/30 p-4 rounded-xl shadow-lg sticky top-4 z-40 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  {selectedIds.length}
                </div>
                <span className="text-sm font-semibold text-indigo-100">
                  Submissions selected for bulk actions
                </span>
              </div>

              {/* Reason override input */}
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Optional admin override reason..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="bg-slate-950 border border-indigo-500/20 text-xs rounded px-3 py-1.5 w-full text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleModeration("accepted")}
                  disabled={isSubmittingAction}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                  title="Approve selected items (Key: A)"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleModeration("rejected")}
                  disabled={isSubmittingAction}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                  title="Reject selected items (Key: R)"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleModeration("spam")}
                  disabled={isSubmittingAction}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                  title="Mark selected as obvious spam (Key: S)"
                >
                  Spam
                </button>
                {activeTab === "accepted" && (
                  <>
                    <button
                      onClick={() => handlePublishing(true)}
                      disabled={isSubmittingAction}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                      title="Publish approved items to public gallery (Key: P)"
                    >
                      Publish
                    </button>
                    <button
                      onClick={() => handlePublishing(false)}
                      disabled={isSubmittingAction}
                      className="bg-zinc-600 hover:bg-zinc-500 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                      title="Unpublish items from public gallery (Key: U)"
                    >
                      Unpublish
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsRevalidateModalOpen(true)}
                  disabled={isSubmittingAction}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                  title="Run manual Gemini revalidation workflow (Key: V)"
                >
                  Revalidate
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1.5"
                  title="Clear all selections (Key: Escape)"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Submissions List / Grid */}
          {filteredSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 rounded-xl bg-slate-900/30 border border-slate-800 text-slate-400">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-sm font-semibold">No submissions in this category</p>
              <p className="text-xs text-slate-500 mt-1">
                Submissions matching "{activeTab.toUpperCase()}" are currently empty.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header Select All Checkbox */}
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/20 border border-slate-800 rounded-lg text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={filteredSubmissions.every((sub) => selectedIds.includes(sub.id))}
                  onChange={handleSelectAll}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
                />
                <span>Select All Visible Submissions</span>
              </div>

              {/* Cards Loop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSubmissions.map((sub, idx) => {
                  const isSelected = selectedIds.includes(sub.id);
                  const isFocused = idx === focusedIndex;
                  const latestAttempt = sub.validationAttempts[0];

                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubmission(sub)}
                      className={`group relative flex flex-col bg-slate-900 border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                        isSelected ? "ring-2 ring-indigo-500 border-indigo-500/40 bg-indigo-950/20" : 
                        isFocused ? "ring-2 ring-slate-400 border-slate-400/40" : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                      }`}
                    >
                      {/* Selection Box overlay */}
                      <div 
                        className="absolute left-3 top-3 z-30"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIds((prev) =>
                            prev.includes(sub.id) ? prev.filter((x) => x !== sub.id) : [...prev, sub.id]
                          );
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Controlled via onClick
                          className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 shadow"
                        />
                      </div>

                      {/* Image Preview Area */}
                      <div className="h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sub.imagePath}
                          alt={sub.dailyTheme.themeText}
                          className="object-contain max-h-full max-w-full transition-transform duration-500 group-hover:scale-105"
                        />
                        
                        {/* Badges Overlay */}
                        <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5 items-end">
                          {sub.isPublishedToGallery ? (
                            <span className="rounded bg-sky-950/90 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-300 shadow backdrop-blur">
                              🏛️ Gallery Published
                            </span>
                          ) : (
                            <span className="rounded bg-slate-950/90 border border-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400 shadow backdrop-blur">
                              📁 Internal Private
                            </span>
                          )}

                          {sub.deletedAt && (
                            <span className="rounded bg-rose-950/90 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300 shadow backdrop-blur animate-pulse">
                              🗑️ Soft Deleted
                            </span>
                          )}

                          {sub.overriddenByAdmin ? (
                            <span className="rounded bg-purple-950/90 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300 shadow backdrop-blur" title={`Overridden by ${sub.adminOverrideBy || "Admin"}: ${sub.adminOverrideReason}`}>
                              🔧 Admin Override
                            </span>
                          ) : (
                            <span className="rounded bg-indigo-950/90 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300 shadow backdrop-blur">
                              🤖 AI Decision
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Meta Content */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Theme Header */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-white truncate" title={sub.dailyTheme.themeText}>
                              {sub.dailyTheme.themeText}
                            </h3>
                          </div>
                          
                          {/* Submitter identifier */}
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            👤 Submitter: <span className="font-mono text-slate-300">{sub.user?.email || `ID: ${sub.userId?.substring(0, 8)}...` || "Anonymous"}</span>
                          </p>

                          {/* Metric scores representation grid */}
                          {latestAttempt ? (
                            <div className="grid grid-cols-5 gap-1.5 bg-slate-950/40 p-2 border border-slate-800/60 rounded-lg mt-3">
                              <div className="text-center">
                                <p className="text-[9px] text-slate-500">Theme</p>
                                <p className={`text-xs font-bold ${latestAttempt.themeMatchScore >= 75 ? "text-emerald-400" : latestAttempt.themeMatchScore >= 60 ? "text-amber-400" : "text-rose-400"}`}>
                                  {latestAttempt.themeMatchScore}
                                </p>
                              </div>
                              <div className="text-center border-l border-slate-800/40">
                                <p className="text-[9px] text-slate-500">Quality</p>
                                <p className="text-xs font-bold text-slate-200">
                                  {latestAttempt.qualityScore}
                                </p>
                              </div>
                              <div className="text-center border-l border-slate-800/40">
                                <p className="text-[9px] text-slate-500">Effort</p>
                                <p className="text-xs font-bold text-slate-200">
                                  {latestAttempt.effortScore}
                                </p>
                              </div>
                              <div className="text-center border-l border-slate-800/40">
                                <p className="text-[9px] text-slate-500">Simple</p>
                                <p className="text-xs font-bold text-slate-200">
                                  {latestAttempt.simplicityScore}
                                </p>
                              </div>
                              <div className="text-center border-l border-slate-800/40">
                                <p className="text-[9px] text-slate-500">Spam</p>
                                <p className={`text-xs font-bold ${latestAttempt.spamScore > 30 ? "text-rose-400" : "text-slate-400"}`}>
                                  {latestAttempt.spamScore}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-950/30 p-2 border border-slate-800 rounded-lg text-center text-[10px] text-slate-500 mt-3">
                              No metrics scores snapshot available
                            </div>
                          )}
                        </div>

                        {/* Card Footer status info */}
                        <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 text-[10px] text-slate-500 mt-2">
                          <span>
                            Attempted {latestAttempt ? new Date(latestAttempt.createdAt).toLocaleDateString() : new Date(sub.createdAt).toLocaleDateString()}
                          </span>
                          <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {latestAttempt?.modelName || "unknown-model"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Workspace Sidebar (Help Panel + Settings QuickLink) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Settings QuickLink Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md space-y-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              ⚙️ Threshold Calibration
            </h3>
            <p className="text-xs text-slate-400">
              Adjust minimum theme matching, low-effort simplicity ratios, and safety levels.
            </p>
            <a
              href="/admin/settings/validation"
              className="block text-center text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 py-2 rounded-lg border border-slate-700 transition"
            >
              Configure Thresholds
            </a>
          </div>

          {/* Beautiful Shortcuts Help Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-xl backdrop-blur space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              ⌨️ Keyboard Workspace Shortcuts
            </h3>
            
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex justify-between items-center">
                <span>Move Focus</span>
                <span className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono font-bold shadow">
                  ▲/▼/◀/▶
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Select / Toggle</span>
                <span className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono font-bold shadow">
                  Spacebar
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-400">
                <span>Approve Item</span>
                <span className="bg-emerald-950/80 border border-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold shadow">
                  A
                </span>
              </div>
              <div className="flex justify-between items-center text-rose-400">
                <span>Reject Item</span>
                <span className="bg-rose-950/80 border border-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono font-bold shadow">
                  R
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Mark as Spam</span>
                <span className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold shadow">
                  S
                </span>
              </div>
              <div className="flex justify-between items-center text-sky-400">
                <span>Publish to Gallery</span>
                <span className="bg-sky-950/80 border border-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono font-bold shadow">
                  P
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Unpublish</span>
                <span className="bg-zinc-950/80 border border-zinc-500/20 text-zinc-300 px-1.5 py-0.5 rounded font-mono font-bold shadow">
                  U
                </span>
              </div>
              <div className="flex justify-between items-center text-purple-400">
                <span>Trigger Revalidation</span>
                <span className="bg-purple-950/80 border border-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold shadow">
                  V
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Clear Selection</span>
                <span className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono font-bold shadow">
                  Escape
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-3">
              💡 Keyboard operations are context-aware and automatically disabled while typing in textareas or inputs.
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Drawer / Expandable Side Sheet Detail View */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-250" onClick={() => setSelectedSubmission(null)}>
          <div 
            className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full p-6 overflow-y-auto shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Submission Audit & History</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Detailed validation logs, attempts history, and decision metadata.
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="text-slate-400 hover:text-slate-200 text-lg p-1"
                >
                  ✕
                </button>
              </div>

              {/* Submission Metadata Block */}
              <div className="grid grid-cols-3 gap-4 bg-slate-950/50 p-4 border border-slate-800 rounded-xl mb-6">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Submitter ID</p>
                  <p className="text-xs text-slate-300 font-mono mt-1 break-all">{selectedSubmission.userId || "Anonymous"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Active Status</p>
                  <span className={`inline-block text-xs px-2.5 py-0.5 rounded font-bold uppercase mt-1 ${
                    (selectedSubmission.effectiveStatus || selectedSubmission.validationStatus) === "accepted" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" :
                    (selectedSubmission.effectiveStatus || selectedSubmission.validationStatus) === "rejected" ? "bg-rose-950 text-rose-400 border border-rose-500/20" :
                    "bg-amber-950 text-amber-400 border border-amber-500/20"
                  }`}>
                    {selectedSubmission.effectiveStatus || selectedSubmission.validationStatus}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Creation Date</p>
                  <p className="text-xs text-slate-300 mt-1">{new Date(selectedSubmission.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Override / Admin Override Action */}
              <div className="bg-slate-950/20 border border-slate-800 p-4 rounded-xl mb-6">
                <h3 className="font-bold text-xs text-slate-300 mb-3 flex items-center gap-1.5">
                  🔧 Manual Decision Override
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                      Override Status
                    </label>
                    <div className="flex gap-2">
                      {(["accepted", "rejected", "borderline", "spam"] as const).map((status) => (
                        <button
                          key={status}
                          onClick={async () => {
                            setSelectedIds([selectedSubmission.id]);
                            await handleModeration(status);
                          }}
                          className={`flex-1 text-xs py-1.5 rounded font-semibold capitalize transition ${
                            (selectedSubmission.effectiveStatus || selectedSubmission.validationStatus) === status
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {status === "borderline" ? "needs review" : status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                      Override Reason / Explanation
                    </label>
                    <textarea
                      placeholder="Specify the reason for manual administrative override..."
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-xs rounded-lg p-3 w-full h-16 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Entire validation attempts history */}
              <div>
                <h3 className="font-bold text-xs text-slate-300 mb-3 flex items-center gap-1.5">
                  📜 Validation Run History ({selectedSubmission.validationAttempts.length})
                </h3>

                {selectedSubmission.validationAttempts.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                    No validation attempts logged for this submission.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedSubmission.validationAttempts.map((attempt) => (
                      <div key={attempt.id} className="border border-slate-800/80 bg-slate-950/20 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-indigo-950/60 border border-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-300 uppercase tracking-wider">
                            Source: {attempt.triggerSource}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(attempt.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {/* Scores breakdowns inside drawer */}
                        <div className="grid grid-cols-5 gap-2 text-center bg-slate-950 p-2 border border-slate-800/40 rounded-lg">
                          <div>
                            <p className="text-[8px] text-slate-500">Theme</p>
                            <p className="text-xs font-bold text-slate-200">{attempt.themeMatchScore}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-500">Quality</p>
                            <p className="text-xs font-bold text-slate-200">{attempt.qualityScore}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-500">Effort</p>
                            <p className="text-xs font-bold text-slate-200">{attempt.effortScore}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-500">Simple</p>
                            <p className="text-xs font-bold text-slate-200">{attempt.simplicityScore}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-500">Spam</p>
                            <p className="text-xs font-bold text-slate-200">{attempt.spamScore}</p>
                          </div>
                        </div>

                        {/* Extra metrics */}
                        <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                          {attempt.isLowEffort && <span className="bg-amber-950/40 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/10">⚠️ Low Effort</span>}
                          {attempt.isOffTheme && <span className="bg-rose-950/40 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/10">❌ Off Theme</span>}
                          {attempt.isObviousSpam && <span className="bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded border border-red-500/10">🚫 Obvious Spam</span>}
                          {attempt.rejectionCodes.length > 0 && (
                            <span className="text-slate-400">
                              Codes: <span className="font-mono text-slate-300">{attempt.rejectionCodes.join(", ")}</span>
                            </span>
                          )}
                        </div>

                        {/* Threshold snapshot visualization */}
                        {attempt.thresholdSnapshot && (
                          <div className="bg-slate-950 p-2 border border-slate-800/40 rounded-lg text-[9px] text-slate-500">
                            <span className="font-semibold text-slate-400">Threshold Settings applied:</span> MinMatch: {attempt.thresholdSnapshot.minThemeMatch ?? attempt.thresholdSnapshot.minThemeMatchScore}%, MinQuality: {attempt.thresholdSnapshot.minQuality ?? attempt.thresholdSnapshot.minQualityScore}%, MinEffort: {attempt.thresholdSnapshot.minEffort ?? attempt.thresholdSnapshot.minEffortScore}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 mt-6">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 rounded-lg border border-slate-700 transition"
              >
                Close Audit Logs Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Revalidation Cost/Confirmation Dialog Modal */}
      {isRevalidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              ⚠️ AI API Calls Cost Warning
            </h3>
            
            <p className="text-xs text-slate-400">
              You are triggering a manual revalidation request of the AI Gemini validation pipeline.
            </p>

            {/* Cost Breakdown */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Selected Submissions:</span>
                <span className="font-bold text-slate-200">{selectedIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expected API Calls:</span>
                <span className="font-bold text-slate-200">{selectedIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active AI Model:</span>
                <span className="font-mono text-indigo-400">gemini-2.5-flash</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated Cost:</span>
                <span className="text-slate-300">Approx. $0.005 (negligible)</span>
              </div>
            </div>

            <p className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg leading-relaxed">
              💡 History Preservation Rule: Previous attempts and database status configurations are never deleted. A new attempt is cleanly appended under source TRIGGER_ADMIN_REVALIDATION.
            </p>

            <div className="flex gap-2 border-t border-slate-800 pt-4 mt-2">
              <button
                onClick={handleManualRevalidate}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs py-2 rounded-lg font-semibold transition"
              >
                Confirm & Run Revalidation
              </button>
              <button
                onClick={() => setIsRevalidateModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 rounded-lg border border-slate-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
