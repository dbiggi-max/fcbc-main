"use client";
import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  adminOverrideSubmission,
  adminBulkOverrideSubmissions,
  adminApproveDataset,
  adminRemoveDataset,
  adminBulkDatasetApproval,
  adminRevalidateSubmission,
  adminSetSubmissionStatus,
  adminSaveSubmissionToDataset,
  adminSaveValidationSettings,
  adminCleanupRejectedSubmissions,
  adminBulkRevalidateSubmissions,
  adminEstimateRevalidationCost
} from "@/app/admin/daily-theme/actions";
import { DailyTheme, ThemeSubmission, Artist } from "@prisma/client";


const ABSTRACT_KEYWORDS = new Set([
  "loneliness", "memory", "memories", "future", "nature", "dream", "dreams", "feeling", "feelings",
  "sadness", "joy", "hope", "time", "silence", "warmth", "solitude", "concept", "conceptual",
  "metaphor", "emotion", "emotional", "love", "peace", "fear", "anger", "summer", "winter", "autumn", "spring"
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function isAbstractTheme(themeText: string): boolean {
  const tokens = tokenize(themeText);
  return tokens.some((token) => ABSTRACT_KEYWORDS.has(token)) || tokens.length > 4;
}


function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div className="text-[9px] text-rose-600 font-mono bg-rose-50 p-1 border border-rose-100 rounded leading-tight break-all w-full text-center">
        ⚠️ Image preview unavailable. Stored path: <span className="font-bold underline text-rose-700">{src || "None"}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

// Define strict typing for props and selections
interface SubmissionsWithRelations extends ThemeSubmission {
  dailyTheme: DailyTheme;
  artist: Artist | null;
  validationAttempts?: any[];
}


interface AdminDailyThemeDashboardProps {
  initialThemes: (DailyTheme & { _count: { themeSubmissions: number } })[];
  initialSubmissions: SubmissionsWithRelations[];
  artists?: any[];
  datasetVersions?: any[];
  licenseRecords?: any[];
  validatorProvider?: string;
  validationSettings?: any;
}

export default function AdminDailyThemeDashboard({
  initialThemes,
  initialSubmissions,
  artists = [],
  datasetVersions = [],
  licenseRecords = [],
  validatorProvider = "mock",
  validationSettings,
}: AdminDailyThemeDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Tab State
  const [activeTab, setActiveTab] = useState<"submissions" | "settings">("submissions");

  // Local settings form state
  const [formProvider, setFormProvider] = useState(validationSettings?.provider || validatorProvider);
  const [formModelName, setFormModelName] = useState(validationSettings?.modelName || "ViT-B-32");
  const [formPretrainedName, setFormPretrainedName] = useState(validationSettings?.pretrainedName || "laion2b_s34b_b79k");
  const [formPromptStrategy, setFormPromptStrategy] = useState(validationSettings?.promptStrategy || "hybrid_similarity");
  const [formRawMin, setFormRawMin] = useState(validationSettings?.rawMin !== undefined ? validationSettings.rawMin : 0.15);
  const [formRawMax, setFormRawMax] = useState(validationSettings?.rawMax !== undefined ? validationSettings.rawMax : 0.35);
  const [formAcceptThreshold, setFormAcceptThreshold] = useState(validationSettings?.acceptThreshold !== undefined ? validationSettings.acceptThreshold : 0.45);
  const [formRejectThreshold, setFormRejectThreshold] = useState(validationSettings?.rejectThreshold !== undefined ? validationSettings.rejectThreshold : 0.45);

  // Settings feedback/notices
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [cleanupResult, setCleanupResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  // Live calibration test tool state
  const [testRawScore, setTestRawScore] = useState(0.24);

  // Search & Filters state
  const [filterValidation, setFilterValidation] = useState("all");
  const [filterDataset, setFilterDataset] = useState("all");
  const [filterTheme, setFilterTheme] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [isAllPagesSelected, setIsAllPagesSelected] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess(null);
    setSettingsError(null);

    startTransition(async () => {
      const res = await adminSaveValidationSettings({
        provider: formProvider,
        modelName: formModelName,
        pretrainedName: formPretrainedName,
        promptStrategy: formPromptStrategy,
        rawMin: Number(formRawMin),
        rawMax: Number(formRawMax),
        acceptThreshold: Number(formAcceptThreshold),
        rejectThreshold: Number(formRejectThreshold),
      });

      if (res.success) {
        setSettingsSuccess("Similarity validation settings updated and audited successfully.");
        router.refresh();
      } else {
        setSettingsError(res.error || "Failed to update validation settings.");
      }
    });
  };

  const handleCleanupRejected = () => {
    setCleanupResult(null);
    startTransition(async () => {
      const res = await adminCleanupRejectedSubmissions();
      if (res.success) {
        setCleanupResult({ success: true, count: res.deletedCount });
        router.refresh();
      } else {
        setCleanupResult({ success: false, error: res.error });
      }
    });
  };

  // Modals / Details states
  const [activeSubmission, setActiveSubmission] = useState<SubmissionsWithRelations | null>(null);
  const [isBulkModalOpen, setIsAllBulkModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"validation" | "dataset" | "revalidate" | null>(null);
  const [bulkActionValue, setBulkActionValue] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkConfirmationInput, setBulkConfirmationInput] = useState("");
  const [estimation, setEstimation] = useState<{
    submissionCount: number;
    expectedRequests: number;
    providerName: string;
    modelName: string;
    estimatedCostUsd: number;
    costWarningRequired: boolean;
    warningMessage: string | null;
  } | null>(null);


  const [individualReason, setIndividualReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);


  // Dataset cataloging selections
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [selectedLicenseId, setSelectedLicenseId] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  // 1. Filtering Logic
  const filteredSubmissions = initialSubmissions.filter((sub) => {
    // Filter Validation Status
    if (filterValidation !== "all") {
      if (filterValidation === "effective_rejected") {
        if (sub.effectiveStatus !== "rejected") return false;
      } else {
        if (sub.validationStatus !== filterValidation) return false;
      }
    }

    // Filter Dataset Status
    if (filterDataset !== "all") {
      if (sub.datasetApprovalStatus !== filterDataset) return false;
    }

    // Filter Themes
    if (filterTheme !== "all") {
      if (sub.dailyThemeId !== filterTheme) return false;
    }

    // Search by User/Prompt/Theme Text
    if (searchText.trim() !== "") {
      const q = searchText.toLowerCase().trim();
      const matchUser = sub.userId?.toLowerCase().includes(q);
      const matchPrompt = sub.promptOrCaption?.toLowerCase().includes(q);
      const matchTheme = sub.dailyTheme.themeText.toLowerCase().includes(q);
      if (!matchUser && !matchPrompt && !matchTheme) return false;
    }

    return true;
  });

  // 2. Sorting Logic
  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === "score_asc") {
      return (a.finalScore || 0) - (b.finalScore || 0);
    }
    if (sortBy === "score_desc") {
      return (b.finalScore || 0) - (a.finalScore || 0);
    }
    
    // Confidence sorting
    const confidenceOrder: Record<string, number> = { low: 1, medium: 2, high: 3 };
    const confA = confidenceOrder[a.confidence || "medium"] || 2;
    const confB = confidenceOrder[b.confidence || "medium"] || 2;

    if (sortBy === "confidence_asc") {
      if (confA !== confB) return confA - confB;
      return (a.finalScore || 0) - (b.finalScore || 0); // Sub-sort by score asc
    }
    if (sortBy === "confidence_desc") {
      if (confA !== confB) return confB - confA;
      return (b.finalScore || 0) - (a.finalScore || 0); // Sub-sort by score desc
    }
    return 0;
  });

  useEffect(() => {
    if (bulkActionType === "revalidate" && isBulkModalOpen) {
      const idsToRevalidate = isAllPagesSelected 
        ? sortedSubmissions.map(s => s.id) 
        : Object.keys(selectedIds).filter((id) => selectedIds[id]);

      const fetchEstimation = async () => {
        const estRes = await adminEstimateRevalidationCost(idsToRevalidate);
        if (estRes.success) {
          setEstimation(estRes as any);
        }
      };
      fetchEstimation();
    } else {
      setEstimation(null);
    }
  }, [bulkActionType, isBulkModalOpen, isAllPagesSelected, selectedIds, sortedSubmissions]);

  // 3. Pagination Slicing
  const totalItems = sortedSubmissions.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedSubmissions = sortedSubmissions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Checkbox interactions
  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
      } else {
        copy[id] = true;
      }
      setIsAllPagesSelected(false);
      return copy;
    });
  };

  const getSelectedCount = () => {
    if (isAllPagesSelected) return totalItems;
    return Object.keys(selectedIds).filter((id) => selectedIds[id]).length;
  };

  const toggleSelectPage = () => {
    const pageIds = paginatedSubmissions.map((s) => s.id);
    const areAllOnPageSelected = pageIds.every((id) => selectedIds[id]);

    setSelectedIds((prev) => {
      const copy = { ...prev };
      if (areAllOnPageSelected) {
        // Deselect all on current page
        pageIds.forEach((id) => {
          delete copy[id];
        });
      } else {
        // Select all on current page
        pageIds.forEach((id) => {
          copy[id] = true;
        });
      }
      setIsAllPagesSelected(false);
      return copy;
    });
  };

  const clearAllSelections = () => {
    setSelectedIds({});
    setIsAllPagesSelected(false);
  };

  const selectAllMatchingFiltered = () => {
    const copy: Record<string, boolean> = {};
    sortedSubmissions.forEach((sub) => {
      copy[sub.id] = true;
    });
    setSelectedIds(copy);
    setIsAllPagesSelected(true);
  };

  // 4. Metadata Exports (JSON / CSV)
  const exportFilteredData = (format: "json" | "csv") => {
    // Only export dataset-approved records matching the filters
    const datasetApprovedMatches = sortedSubmissions.filter(
      (sub) => sub.datasetApprovalStatus === "approved"
    );

    if (datasetApprovedMatches.length === 0) {
      alert("No dataset-approved assets matching the current filters were found to export.");
      return;
    }

    if (format === "json") {
      const jsonContent = JSON.stringify(datasetApprovedMatches, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fcbc_dataset_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV format
      const headers = [
        "SubmissionId",
        "ThemeId",
        "ThemeText",
        "UserId",
        "ImagePath",
        "CaptionOrPrompt",
        "CLIPScore",
        "FinalScore",
        "PositiveSimilarity",
        "NegativeSimilarity",
        "MarginSimilarity",
        "CaptionThemeSimilarity",
        "BackgroundZScore",
        "ThresholdUsed",
        "Confidence",
        "InterpretationType",
        "AIExplanation",
        "AdminOverride",
        "AdminOverrideStatus",
        "DatasetApprovedAt"
      ];
      
      const csvRows = [headers.join(",")];
      
      datasetApprovedMatches.forEach((sub) => {
        const metadata = sub.validationMetadata as any;
        const row = [
          sub.id,
          sub.dailyThemeId,
          `"${sub.dailyTheme.themeText.replace(/"/g, '""')}"`,
          sub.userId || "anonymous",
          sub.imagePath,
          `"${(sub.promptOrCaption || "").replace(/"/g, '""')}"`,
          sub.clipSimilarityScore || "",
          sub.finalScore || "",
          sub.positiveScore ?? "",
          sub.negativeScore ?? "",
          sub.marginScore ?? "",
          sub.captionThemeScore ?? "",
          sub.backgroundZScore ?? "",
          sub.thresholdUsed ?? "",
          sub.confidence || "medium",
          sub.interpretationType || "unclear",
          `"${(sub.validationExplanation || "").replace(/"/g, '""')}"`,
          sub.overriddenByAdmin ? "TRUE" : "FALSE",
          sub.adminOverrideStatus || "",
          sub.datasetApprovedAt ? sub.datasetApprovedAt.toISOString() : ""
        ];
        csvRows.push(row.join(","));
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fcbc_dataset_export_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // 5. Action Execution Wrappers
  const handleIndividualOverride = (id: string, status: "accepted" | "rejected") => {
    setActionError(null);
    startTransition(async () => {
      const result = await adminOverrideSubmission({
        id,
        status,
        reason: individualReason,
      });
      if (result.success) {
        setIndividualReason("");
        // Reload details modal with updated attributes
        const updated = initialSubmissions.find((s) => s.id === id);
        if (updated) {
          setActiveSubmission(updated);
        } else {
          setActiveSubmission(null);
        }
        router.refresh();
      } else {
        setActionError(result.error || "Override failed.");
      }
    });
  };

  const handleRevalidate = (id: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await adminRevalidateSubmission(id);
      if (result.success) {
        if (result.submission) {
          const matchedRel = initialSubmissions.find((s) => s.id === id);
          if (matchedRel) {
            Object.assign(matchedRel, result.submission);
            if (activeSubmission && activeSubmission.id === id) {
              setActiveSubmission({ ...matchedRel });
            }
          }
        }
        router.refresh();
      } else {
        setActionError(result.error || "Revalidation failed.");
      }
    });
  };

  const handleIndividualStatusChange = (id: string, status: "accepted" | "needs_review" | "rejected") => {
    setActionError(null);
    startTransition(async () => {
      const result = await adminSetSubmissionStatus({
        id,
        status,
        note: individualReason,
      });
      if (result.success) {
        setIndividualReason("");
        const updated = initialSubmissions.find((s) => s.id === id);
        if (updated) {
          // Sync state locally to avoid lagging on server refresh
          Object.assign(updated, { validationStatus: status, effectiveStatus: status });
          if (activeSubmission && activeSubmission.id === id) {
            setActiveSubmission({ ...updated });
          }
        } else {
          setActiveSubmission(null);
        }
        router.refresh();
      } else {
        setActionError(result.error || "Status update failed.");
      }
    });
  };

  const handleSaveToDataset = (id: string) => {
    setActionError(null);
    if (!selectedArtistId) {
      setActionError("Please select an Artist.");
      return;
    }
    if (!selectedVersionId) {
      setActionError("Please select a Dataset Version.");
      return;
    }
    if (!consentChecked) {
      setActionError("You must verify and check the consent warning before saving.");
      return;
    }

    startTransition(async () => {
      const result = await adminSaveSubmissionToDataset({
        submissionId: id,
        artistId: selectedArtistId,
        datasetVersionId: selectedVersionId,
        licenseRecordId: selectedLicenseId || undefined,
        note: individualReason,
      });

      if (result.success) {
        setIndividualReason("");
        setSelectedArtistId("");
        setSelectedVersionId("");
        setSelectedLicenseId("");
        setConsentChecked(false);
        setActiveSubmission(null);
        router.refresh();
      } else {
        setActionError(result.error || "Dataset enrollment failed.");
      }
    });
  };

  const handleBulkActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    // Safeguard confirm check
    if (isAllPagesSelected && bulkConfirmationInput !== "CONFIRM") {
      setActionError("Please type CONFIRM in uppercase to authorize bulk execution across paginated boundaries.");
      return;
    }

    const idsToUpdate = isAllPagesSelected ? undefined : Object.keys(selectedIds).filter((id) => selectedIds[id]);

    startTransition(async () => {
      let result;
      if (bulkActionType === "validation") {
        result = await adminBulkOverrideSubmissions({
          ids: idsToUpdate,
          status: bulkActionValue as "accepted" | "rejected",
          reason: bulkReason,
          filter: isAllPagesSelected ? {
            validationStatus: filterValidation,
            datasetApprovalStatus: filterDataset,
            search: searchText,
            themeId: filterTheme,
          } : undefined,
        });
      } else if (bulkActionType === "revalidate") {
        const targetIds = isAllPagesSelected 
          ? sortedSubmissions.map(s => s.id) 
          : Object.keys(selectedIds).filter((id) => selectedIds[id]);
        result = await adminBulkRevalidateSubmissions(targetIds);
      } else {
        result = await adminBulkDatasetApproval({
          ids: idsToUpdate,
          status: bulkActionValue as "approved" | "removed",
          reason: bulkReason,
          filter: isAllPagesSelected ? {
            validationStatus: filterValidation,
            datasetApprovalStatus: filterDataset,
            search: searchText,
            themeId: filterTheme,
          } : undefined,
        });
      }


      if (result.success) {
        setIsAllBulkModalOpen(false);
        setBulkReason("");
        setBulkActionValue("");
        setBulkConfirmationInput("");
        setSelectedIds({});
        setIsAllPagesSelected(false);
        router.refresh();
      } else {
        setActionError(result.error || "Bulk process failed.");
      }
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-8 text-slate-900 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-5 border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Thematic Asset Moderation Console
          </h1>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-4xl font-medium">
            Analyze drawing alignments, trigger overrides, separate raw collections into approved training corpora, and export validated dataset archives.
          </p>
        </div>

        {/* Global Dataset approved exports */}
        <div className="flex items-center gap-2 mt-4 md:mt-0 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono mr-1">EXPORT DATASET:</span>
          <button
            onClick={() => exportFilteredData("json")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm hover:bg-slate-100 transition-all cursor-pointer"
          >
            JSON
          </button>
          <button
            onClick={() => exportFilteredData("csv")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm hover:bg-slate-100 transition-all cursor-pointer"
          >
            CSV
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-6 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === "submissions"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Submissions Queue
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-6 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "settings"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Validator Settings
        </button>
      </div>

      {activeTab === "submissions" ? (
        <>
          {/* Validator Provider Info and Warnings */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Semantic Ingestion Guard Status
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Current active validator provider: <code className="font-mono bg-slate-100 text-slate-800 px-1 py-0.5 rounded border border-slate-200 text-[10px] font-bold">{validatorProvider}</code>
            </p>
          </div>
          {validatorProvider === "mock" && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 max-w-xl">
              <svg className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-[11px] text-amber-800 leading-normal font-semibold text-left">
                Mock validation is for prototype UI testing only. Use the Python CLIP validator for real semantic checks.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Stats Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm text-left">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total collected</p>
          <h3 className="text-xl font-black font-mono text-slate-800 mt-1">{initialSubmissions.length}</h3>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm text-left">
          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Validation accepted</p>
          <h3 className="text-xl font-black font-mono text-emerald-600 mt-1">
            {initialSubmissions.filter((s) => s.effectiveStatus === "accepted").length}
          </h3>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm text-left">
          <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">Validation rejected</p>
          <h3 className="text-xl font-black font-mono text-rose-600 mt-1">
            {initialSubmissions.filter((s) => s.effectiveStatus === "rejected").length}
          </h3>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm text-left">
          <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Dataset Enrolled</p>
          <h3 className="text-xl font-black font-mono text-indigo-600 mt-1">
            {initialSubmissions.filter((s) => s.datasetApprovalStatus === "approved").length}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side Column: Interactive Filters Box */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-left space-y-5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-2 border-slate-100 flex justify-between items-center">
              <span>Refine queue</span>
              {(filterValidation !== "all" || filterDataset !== "all" || filterTheme !== "all" || searchText !== "") && (
                <button
                  onClick={() => {
                    setFilterValidation("all");
                    setFilterDataset("all");
                    setFilterTheme("all");
                    setSearchText("");
                  }}
                  className="text-[9px] text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Reset all
                </button>
              )}
            </h3>

            {/* Filter by Validation Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Validation Status</label>
              <select
                value={filterValidation}
                onChange={(e) => { setFilterValidation(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All validation results</option>
                <option value="accepted">Accepted (AI Approved)</option>
                <option value="borderline">Borderline (AI Uncertain)</option>
                <option value="rejected">Rejected (AI Trash)</option>
                <option value="spam">Spam (AI Filtered)</option>
                <option value="effective_rejected">Effective Rejected (AI + Overrides)</option>
              </select>

            </div>

            {/* Filter by Dataset Enrollment */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dataset Enrollment</label>
              <select
                value={filterDataset}
                onChange={(e) => { setFilterDataset(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All dataset states</option>
                <option value="not_approved">Not Approved (Held)</option>
                <option value="approved">Approved (Enrolled)</option>
                <option value="removed">Revoked (Excluded)</option>
              </select>
            </div>

            {/* Filter by Themes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Daily Challenge Themes</label>
              <select
                value={filterTheme}
                onChange={(e) => { setFilterTheme(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All themes ({initialThemes.length})</option>
                {initialThemes.map((t) => (
                  <option key={t.id} value={t.id}>
                    &ldquo;{t.themeText}&rdquo; ({t._count.themeSubmissions})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Search text</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                placeholder="Submitter id, caption text..."
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Sorting Index */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sorting priority</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:border-indigo-500 font-bold text-indigo-900 bg-indigo-50/50 border-indigo-100"
              >
                <option value="confidence_asc">Confidence (Lowest First)</option>
                <option value="confidence_desc">Confidence (Highest First)</option>
                <option value="newest">Newest Submission</option>
                <option value="oldest">Oldest Submission</option>
                <option value="score_asc">Final Score (Ascending)</option>
                <option value="score_desc">Final Score (Descending)</option>
              </select>
              <span className="text-[9px] text-indigo-500 block leading-normal italic">
                💡 Tip: Use Lowest Confidence first to immediately identify borderline AI decisions needing overrides.
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Column: Table List and Selection Overlays (3-col width) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Row selection batch actions toolbar */}
          {getSelectedCount() > 0 && (
            <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4.5 animate-slideUp border border-indigo-500/20 shadow-lg shadow-indigo-950/20">
              <div className="text-left space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-indigo-400">Batch selection active</p>
                <p className="text-xs text-slate-300 font-medium">
                  {getSelectedCount()} submissions selected {isAllPagesSelected ? "across all paginated matches." : `on current view.`}
                </p>
                {!isAllPagesSelected && totalItems > paginatedSubmissions.length && (
                  <button
                    onClick={selectAllMatchingFiltered}
                    className="text-[10px] text-indigo-300 font-bold hover:underline underline-offset-2 cursor-pointer mt-0.5 block"
                  >
                    Select all {totalItems} matching matches across pages
                  </button>
                )}
                {isAllPagesSelected && (
                  <button
                    onClick={clearAllSelections}
                    className="text-[10px] text-rose-300 font-bold hover:underline cursor-pointer mt-0.5 block"
                  >
                    Clear selections
                  </button>
                )}
              </div>

              {/* Operations */}
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={() => {
                    setBulkActionType("revalidate");
                    setBulkActionValue("revalidate");
                    setIsAllBulkModalOpen(true);
                  }}
                  className="rounded-lg bg-amber-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-amber-500 shadow-sm transition-all cursor-pointer border border-amber-400/20"
                >
                  ⚡ Re-run AI Validation
                </button>
                <button
                  onClick={() => {
                    setBulkActionType("validation");
                    setBulkActionValue("accepted");
                    setIsAllBulkModalOpen(true);
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-500 shadow-sm transition-all cursor-pointer"
                >
                  Approve Validation
                </button>

                <button
                  onClick={() => {
                    setBulkActionType("validation");
                    setBulkActionValue("rejected");
                    setIsAllBulkModalOpen(true);
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
                >
                  Reject Validation
                </button>
                <button
                  onClick={() => {
                    setBulkActionType("dataset");
                    setBulkActionValue("approved");
                    setIsAllBulkModalOpen(true);
                  }}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-indigo-500 shadow-sm transition-all cursor-pointer border border-indigo-400/20"
                >
                  Enroll Dataset
                </button>
                <button
                  onClick={() => {
                    setBulkActionType("dataset");
                    setBulkActionValue("removed");
                    setIsAllBulkModalOpen(true);
                  }}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-slate-700 shadow-sm transition-all cursor-pointer border border-slate-700"
                >
                  Revoke Dataset
                </button>
              </div>
            </div>
          )}

          {/* Table Box */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-left">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-3 border-slate-100 flex justify-between items-center">
              <span>Verification ledger</span>
              <span className="font-mono text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded">
                MATCHED: {totalItems} / {initialSubmissions.length}
              </span>
            </h3>

            <div className="overflow-x-auto mt-4">
              {paginatedSubmissions.length > 0 ? (
                <table className="min-w-full divide-y divide-slate-100 table-fixed">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left">
                      <th className="w-10 py-2.5">
                        <input
                          type="checkbox"
                          checked={paginatedSubmissions.every((s) => selectedIds[s.id])}
                          onChange={toggleSelectPage}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                        />
                      </th>
                      <th className="w-20 py-2.5">Preview</th>
                      <th className="w-32 py-2.5">Challenge Theme</th>
                      <th className="py-2.5">Candidate Asset Detail</th>
                      <th className="w-28 py-2.5">AI Validation</th>
                      <th className="w-24 py-2.5 text-right">Dataset State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {paginatedSubmissions.map((sub) => {
                      const createdDateStr = new Date(sub.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      });

                      const isSelected = !!selectedIds[sub.id];
                      const metadata = sub.validationMetadata as any;
                      const isExpired = sub.retentionUntil && new Date(sub.retentionUntil).getTime() < Date.now();

                      return (
                        <tr
                          key={sub.id}
                          onClick={() => setActiveSubmission(sub)}
                          className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                            isSelected ? "bg-indigo-50/20" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(sub.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                            />
                          </td>

                          {/* Preview */}
                          <td className="py-3.5">
                            <div className="h-10 w-10 rounded overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center relative shadow-xs">
                              <ImageWithFallback
                                src={sub.imagePath}
                                alt="moderation preview"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 mt-0.5 block">
                              {createdDateStr}
                            </span>
                          </td>

                          {/* Challenge Theme */}
                          <td className="py-3.5 pr-2 truncate">
                            <p className="font-extrabold text-slate-800 leading-tight">
                              &ldquo;{sub.dailyTheme.themeText}&rdquo;
                            </p>
                            <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.25 mt-1 inline-block">
                              {isAbstractTheme(sub.dailyTheme.themeText) ? "ABSTRACT" : "CONCRETE"}
                            </span>
                          </td>

                          {/* Candidate Detail */}
                          <td className="py-3.5 pr-4">
                            <p className="font-semibold text-slate-800 line-clamp-1 leading-normal">
                              {sub.promptOrCaption || <span className="italic text-slate-300">No description provided</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 block mt-0.5 truncate">
                              ID: <code className="font-mono text-slate-500">{sub.id.slice(0, 12)}...</code>
                              {sub.userId && <span className="ml-2">• Submitter: <code className="font-mono text-slate-500">{sub.userId}</code></span>}
                            </p>
                            
                            {/* Override Indicator */}
                            {sub.overriddenByAdmin && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider bg-amber-50 border border-amber-100 rounded-sm px-1 py-0.25">
                                  OVERRIDDEN BY ADMIN
                                </span>
                              </div>
                            )}

                            {/* 30-Day Retention Clock */}
                            {sub.retentionUntil && (
                              <div className="flex items-center gap-1 mt-1 text-[9px] font-bold">
                                <svg className={`h-3 w-3 ${isExpired ? "text-red-500" : "text-amber-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className={isExpired ? "text-red-500" : "text-amber-600"}>
                                  {isExpired ? "Retention Expired" : `Retention limit: ${new Date(sub.retentionUntil).toLocaleDateString()}`}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* AI Validation */}
                          <td className="py-3.5">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-mono font-bold ${
                                sub.effectiveStatus === "accepted"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                  : "bg-rose-50 text-rose-800 border border-rose-100"
                              }`}>
                                {sub.effectiveStatus}
                              </span>
                              <span className="text-[9px] font-mono text-slate-400 block font-bold">
                                {sub.finalScore !== null ? `Raw score: ${sub.finalScore.toFixed(3)}` : `Legacy score: ${sub.clipSimilarityScore}`}
                              </span>
                              {sub.confidence && (
                                <span className={`inline-flex text-[8px] font-bold uppercase tracking-wider font-mono px-1 rounded-sm border ${
                                  sub.confidence === "high"
                                    ? "bg-emerald-100/50 text-emerald-800 border-emerald-200"
                                    : sub.confidence === "medium"
                                    ? "bg-amber-100/50 text-amber-800 border-amber-200"
                                    : "bg-rose-100/50 text-rose-800 border-rose-200"
                                }`}>
                                  CONF: {sub.confidence}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Dataset State */}
                          <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end items-center gap-2">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                sub.datasetApprovalStatus === "approved"
                                  ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                                  : sub.datasetApprovalStatus === "removed"
                                  ? "text-rose-600 bg-rose-50 border border-rose-100"
                                  : "text-slate-400 bg-slate-50 border border-slate-100"
                              }`}>
                                {sub.datasetApprovalStatus === "approved"
                                  ? "Enrolled"
                                  : sub.datasetApprovalStatus === "removed"
                                  ? "Revoked"
                                  : "Held"}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevalidate(sub.id);
                                }}
                                disabled={isPending}
                                title="Re-run validation"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
                              >
                                <svg className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 16.038M15 11h6V5" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-slate-400 text-center py-12">
                  No matches found for today&apos;s filtration criteria.
                </p>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-4">
                <button
                  onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                  PAGE {currentPage} OF {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {/* Warning banner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4.5 text-left text-amber-900 flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs space-y-1 font-medium">
              <p className="font-extrabold text-amber-950 uppercase tracking-wider text-[10px]">⚠️ Operational Safety Warning</p>
              <p className="leading-relaxed text-slate-600 font-semibold">
                Changing pipeline weights, floor/ceiling bounds, and validation providers will immediately alter decisions for all new submissions and subsequent manual revalidations. Existing audited submissions are not retrospectively affected.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start text-left">
            {/* Pipeline Configuration Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6.5 shadow-sm space-y-6">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Pipeline Configuration</h2>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Configure weights, pretrained model targets, ensembling strategies, and decision boundary calibration.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* Active Provider */}
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active ML Provider</label>
                  <select
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="mock">Mock Offline Validator (Deterministic Overlaps)</option>
                    <option value="python">Local Python Subprocess (OpenCLIP PyTorch ML Engine)</option>
                    <option value="remote">Remote API VLM / CLIP Node Validator</option>
                  </select>
                </div>

                {/* Model Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">CLIP Model Architecture</label>
                    <select
                      value={formModelName}
                      onChange={(e) => setFormModelName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="ViT-B-32">ViT-B-32 (Fast, Balanced)</option>
                      <option value="ViT-L-14">ViT-L-14 (Premium Precision)</option>
                      <option value="openai/clip-vit-base-patch32">HuggingFace openai/clip-vit-base-patch32</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pretrained Weights</label>
                    <select
                      value={formPretrainedName}
                      onChange={(e) => setFormPretrainedName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="laion2b_s34b_b79k">LAION-2B (s34b_b79k)</option>
                      <option value="openai">OpenAI (Original Weights)</option>
                    </select>
                  </div>
                </div>

                {/* Strategy dropdown */}
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Prompt Expansion Strategy</label>
                  <select
                    value={formPromptStrategy}
                    onChange={(e) => setFormPromptStrategy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="hybrid_similarity">Hybrid Ensembling (Positive + Negative Prompts)</option>
                    <option value="standard">Standard (Drawing & Illustration styles)</option>
                    <option value="descriptive">Descriptive (Technical rendering details)</option>
                    <option value="metaphorical">Metaphorical (Abstract artistic concepts)</option>
                  </select>
                </div>

                {/* Calibration Floors */}
                <div className="border-t border-slate-100 pt-4 space-y-4 text-xs">
                  <h3 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Calibration Floor & Ceiling</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Raw Min (Floor)</span>
                        <span className="font-mono text-indigo-600 font-black">{formRawMin}</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.25"
                        step="0.01"
                        value={formRawMin}
                        onChange={(e) => setFormRawMin(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Raw Max (Ceiling)</span>
                        <span className="font-mono text-indigo-600 font-black">{formRawMax}</span>
                      </div>
                      <input
                        type="range"
                        min="0.25"
                        max="0.55"
                        step="0.01"
                        value={formRawMax}
                        onChange={(e) => setFormRawMax(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    Values below Floor map near 0% calibrated similarity. Values above Ceiling map near 100%. Values in-between scale linearly.
                  </p>
                </div>

                {/* Decision Boundaries */}
                <div className="border-t border-slate-100 pt-4 space-y-4 text-xs">
                  <h3 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Calibrated Decision Boundaries</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Reject Threshold</span>
                        <span className="font-mono text-indigo-600 font-black">{(formRejectThreshold * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="0.90"
                        step="0.05"
                        value={formRejectThreshold}
                        onChange={(e) => setFormRejectThreshold(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Accept Threshold</span>
                        <span className="font-mono text-indigo-600 font-black">{(formAcceptThreshold * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="0.90"
                        step="0.05"
                        value={formAcceptThreshold}
                        onChange={(e) => setFormAcceptThreshold(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {settingsSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold leading-normal">
                    ✓ {settingsSuccess}
                  </div>
                )}
                {settingsError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] font-semibold leading-normal">
                    ⚠️ {settingsError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] uppercase tracking-wider py-3.5 shadow-md transition-all cursor-pointer disabled:opacity-55 disabled:pointer-events-none"
                >
                  {isPending ? "Applying changes..." : "Save & Audit Calibration Settings"}
                </button>
              </form>
            </div>

            {/* Scale Visualizer and Simulation */}
            <div className="space-y-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-6.5 shadow-sm space-y-6">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Live Calibration Map</h2>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    This interactive scale shows how raw cosine similarities from OpenCLIP map onto calibrated percentages.
                  </p>
                </div>

                {/* CSS Segment Bar */}
                <div className="space-y-4">
                  <div className="relative h-16 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex font-mono text-[9px] font-bold">
                    {/* Floor Area */}
                    <div
                      style={{ width: `${Math.max(15, (formRawMin / 0.5) * 100)}%` }}
                      className="h-full bg-slate-200/70 border-r border-dashed border-slate-300 flex items-center justify-center text-slate-400 tracking-wider shrink-0"
                    >
                      FLOOR (0%)
                    </div>

                    {/* Gradient Area */}
                    <div
                      style={{ width: `${Math.max(30, ((formRawMax - formRawMin) / 0.5) * 100)}%` }}
                      className="h-full bg-gradient-to-r from-slate-200/50 via-indigo-50 to-indigo-100/60 border-r border-dashed border-slate-300 flex items-center justify-center text-indigo-500 tracking-wider relative shrink-0"
                    >
                      SCALED RANGE
                      
                      {/* Reject Line */}
                      <div
                        style={{ left: `${formRejectThreshold * 100}%` }}
                        className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                      >
                        <span className="absolute bottom-1 -left-10 bg-rose-600 text-[8px] text-white px-1 py-0.5 rounded font-black whitespace-nowrap shadow-sm">
                          REJ ({(formRejectThreshold * 100).toFixed(0)}%)
                        </span>
                      </div>

                      {/* Accept Line */}
                      <div
                        style={{ left: `${formAcceptThreshold * 100}%` }}
                        className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 z-10"
                      >
                        <span className="absolute top-1 -left-10 bg-emerald-600 text-[8px] text-white px-1 py-0.5 rounded font-black whitespace-nowrap shadow-sm">
                          ACC ({(formAcceptThreshold * 100).toFixed(0)}%)
                        </span>
                      </div>
                    </div>

                    {/* Ceiling Area */}
                    <div className="h-full bg-indigo-200/40 flex-1 flex items-center justify-center text-indigo-700 tracking-wider">
                      CEILING (100%)
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-mono font-bold px-1">
                    <span>Raw: 0.0</span>
                    <span>Min: {formRawMin}</span>
                    <span>Max: {formRawMax}</span>
                    <span>Raw: 0.5+</span>
                  </div>
                </div>

                {/* Sim Box */}
                {(() => {
                  let testCalibrated = 0.0;
                  if (testRawScore <= formRawMin) {
                    testCalibrated = 0.0;
                  } else if (testRawScore >= formRawMax) {
                    testCalibrated = 1.0;
                  } else {
                    testCalibrated = (testRawScore - formRawMin) / (formRawMax - formRawMin);
                  }
                  const testDisplayScore = Math.round(testCalibrated * 100);

                  let testStatus = "Borderline";
                  if (testCalibrated >= formAcceptThreshold) {
                    testStatus = "Accepted";
                  } else if (testCalibrated < formRejectThreshold) {
                    testStatus = "Rejected";
                  }

                  return (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/10 p-4.5 space-y-4 text-left">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[11px] font-black uppercase text-indigo-900 tracking-wide flex items-center gap-1">
                          <svg className="h-4 w-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.001 0 0120.488 9z" />
                          </svg>
                          Interactive Calibration Sandbox
                        </h4>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                          testStatus === "Accepted"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : testStatus === "Rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {testStatus}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          <span>Simulated raw cosine similarity score</span>
                          <span className="font-mono text-indigo-600 font-black">{testRawScore.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="0.5"
                          step="0.01"
                          value={testRawScore}
                          onChange={(e) => setTestRawScore(Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-indigo-100/50 pt-3">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Calibrated Score</p>
                          <p className="text-xl font-black text-indigo-950 font-mono mt-0.5">{testDisplayScore}%</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Moderation Result</p>
                          <p className={`text-xs font-bold mt-1.5 leading-tight ${
                            testStatus === "Accepted"
                              ? "text-emerald-600"
                              : testStatus === "Rejected"
                              ? "text-rose-600"
                              : "text-amber-600"
                          }`}>
                            {testStatus === "Accepted" && "PROVISIONALLY ACCEPTED"}
                            {testStatus === "Rejected" && "REJECTED (30-day Retention)"}
                            {testStatus === "Borderline" && "NEEDS HUMAN MODERATION"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Data Compliance & Cleanup section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6.5 shadow-sm space-y-4.5 text-left">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Data Compliance & Cleanup</h2>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    Run manual storage maintenance routines to enforce the 30-day compliance guidelines.
                  </p>
                </div>

                <div className="text-xs text-slate-500 leading-relaxed font-medium space-y-2.5">
                  <p>
                    Rejected submissions are held in PostgreSQL for <strong>30 days</strong> for audit and potential recovery. After 30 days, un-appealed records are eligible for deletion.
                  </p>
                  <p className="text-amber-700 font-semibold text-[11px]">
                    ⚠️ Operational Note: Running the cleanup task deletes database metadata rows only. Uploaded physical image files remain intact inside storage to prevent accidental data loss.
                  </p>
                </div>

                {cleanupResult && (
                  <div className={`p-3 text-xs font-semibold rounded-lg ${
                    cleanupResult.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}>
                    {cleanupResult.success ? `✓ Safe database cleanup complete. Removed ${cleanupResult.count} old rejected submissions.` : `⚠️ Cleanup failure: ${cleanupResult.error}`}
                  </div>
                )}

                <button
                  onClick={handleCleanupRejected}
                  disabled={isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider py-3.5 shadow-sm transition-all cursor-pointer disabled:opacity-55 disabled:pointer-events-none"
                >
                  {isPending ? "Executing Maintenance Task..." : "Run 30-Day Auto-Cleanup Task Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Audit Details Modal */}
      {activeSubmission && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex justify-end animate-fadeIn">
          <div
            className="w-full max-w-xl bg-white h-full shadow-2xl p-6.5 overflow-y-auto space-y-6 relative animate-slideLeft text-left border-l border-slate-100 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b pb-4 border-slate-100">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    SUBMISSION METADATA AUDIT
                  </span>
                  <h2 className="text-base font-black text-slate-900 leading-tight truncate max-w-md mt-0.5">
                    &ldquo;{activeSubmission.dailyTheme.themeText}&rdquo; Ingestion
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setActiveSubmission(null);
                    setActionError(null);
                    setIndividualReason("");
                    setSelectedArtistId("");
                    setSelectedVersionId("");
                    setSelectedLicenseId("");
                    setConsentChecked(false);
                  }}
                  className="h-8 w-8 rounded-full border border-slate-100 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer text-slate-400 hover:text-slate-800"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Action error alerts */}
              {actionError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex gap-2 mt-4">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{actionError}</span>
                </div>
              )}

              {/* Audit Details */}
              <div className="space-y-5 pt-4">
                {/* Visual Image Render */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-950 aspect-video flex items-center justify-center relative shadow-inner">
                  <ImageWithFallback
                    src={activeSubmission.imagePath}
                    alt="Ingested Asset preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300">
                    File: {activeSubmission.imagePath}
                  </div>
                </div>

                {/* Score Indicators Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">RAW ENSEMBLE SCORE</span>
                    <span className="text-base font-black font-mono text-indigo-700 mt-1 block">
                      {activeSubmission.finalScore !== null ? activeSubmission.finalScore.toFixed(3) : "PENDING"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">POSITIVE AVG</span>
                    <span className="text-base font-black font-mono text-slate-700 mt-1 block">
                      {activeSubmission.positiveScore !== null ? activeSubmission.positiveScore.toFixed(3) : "N/A"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">NEGATIVE MAX</span>
                    <span className="text-base font-black font-mono text-slate-700 mt-1 block">
                      {activeSubmission.negativeScore !== null ? activeSubmission.negativeScore.toFixed(3) : "N/A"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">MARGIN</span>
                    <span className="text-base font-black font-mono text-slate-700 mt-1 block">
                      {activeSubmission.marginScore !== null ? activeSubmission.marginScore.toFixed(3) : "N/A"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">CAPTION ↔ THEME</span>
                    <span className="text-base font-black font-mono text-emerald-600 mt-1 block">
                      {activeSubmission.captionThemeScore !== null ? activeSubmission.captionThemeScore.toFixed(3) : "N/A"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">BACKGROUND Z</span>
                    <span className="text-base font-black font-mono text-emerald-600 mt-1 block">
                      {activeSubmission.backgroundZScore !== null ? activeSubmission.backgroundZScore.toFixed(2) : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Properties list */}
                <div className="space-y-2 border border-slate-100 rounded-xl p-4.5 bg-slate-50/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Submission ID:</span>
                    <code className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded select-all text-slate-600 text-[10px]">{activeSubmission.id}</code>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Created Date:</span>
                    <span className="font-mono text-slate-700 font-semibold">{new Date(activeSubmission.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Submitter ID:</span>
                    <span className="font-mono text-slate-700 font-semibold">{activeSubmission.userId || "anonymous"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Daily Theme:</span>
                    <span className="font-bold text-slate-800">&ldquo;{activeSubmission.dailyTheme.themeText}&rdquo;</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Caption / Prompt:</span>
                    <span className="font-semibold text-slate-700">{activeSubmission.promptOrCaption || <span className="italic text-slate-300">None provided</span>}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Linked Artist style:</span>
                    <span className="font-bold text-indigo-600">{activeSubmission.artist?.displayName || "None Linked"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">CLIP/Mock similarity score:</span>
                    <span className="font-mono font-bold text-slate-700">{activeSubmission.clipSimilarityScore !== null ? activeSubmission.clipSimilarityScore.toFixed(4) : "None"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Validation status:</span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-mono font-bold ${
                      activeSubmission.validationStatus === "accepted"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                        : activeSubmission.validationStatus === "needs_review"
                        ? "bg-amber-50 text-amber-800 border border-amber-100"
                        : "bg-rose-50 text-rose-800 border border-rose-100"
                    }`}>
                      {activeSubmission.validationStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Saved to dataset:</span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-mono font-bold ${
                      activeSubmission.savedToDataset
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}>
                      {activeSubmission.savedToDataset ? "YES" : "NO"}
                    </span>
                  </div>
                  {activeSubmission.generatedCaption && (
                    <div className="flex justify-between items-start text-xs pt-1.5 border-t border-slate-200/50">
                      <span className="text-slate-400 font-bold uppercase text-[9px] shrink-0 mt-0.5">Model-generated caption:</span>
                      <span className="font-semibold text-slate-700 text-right max-w-[300px]">{activeSubmission.generatedCaption}</span>
                    </div>
                  )}
                  {activeSubmission.detectedConcepts && (
                    <div className="flex justify-between items-start text-xs pt-1.5 border-t border-slate-200/50">
                      <span className="text-slate-400 font-bold uppercase text-[9px] shrink-0 mt-0.5">Detected semantic tags:</span>
                      <span className="font-semibold text-slate-700 text-right flex flex-wrap gap-1 justify-end max-w-[280px]">
                        {activeSubmission.detectedConcepts.split(", ").map((t) => (
                          <span key={t} className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-600">{t}</span>
                        ))}
                      </span>
                    </div>
                  )}
                </div>

                {/* Explanations text */}
                <div className="space-y-1.5 text-xs text-left">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">AI Decision Reasoning explanation</span>
                  <p className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl leading-relaxed text-indigo-950 font-medium">
                    {activeSubmission.validationExplanation || "No analysis explanation returned by the model pipeline."}
                  </p>
                </div>

                {/* Pipeline metadata for Audit transparency */}
                {/* Validation Attempts History */}
                {activeSubmission.validationAttempts && (activeSubmission.validationAttempts as any[]).length > 0 && (
                  <div className="space-y-2 text-xs text-left">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">AI Validation Audit History</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {(activeSubmission.validationAttempts as any[]).map((attempt) => {
                        const attemptDate = new Date(attempt.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        return (
                          <div key={attempt.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5 shadow-2xs leading-normal">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-mono text-slate-400 font-bold">{attemptDate}</span>
                              <span className={`px-1.5 py-0.25 text-[8px] uppercase font-mono font-black rounded-sm border ${
                                attempt.decision === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                                  : attempt.decision === "NEEDS_REVIEW"
                                  ? "bg-amber-50 text-amber-800 border-amber-100"
                                  : attempt.decision === "SPAM"
                                  ? "bg-purple-50 text-purple-800 border-purple-100"
                                  : "bg-rose-50 text-rose-800 border-rose-100"
                              }`}>
                                {attempt.decision}
                              </span>
                            </div>
                            <div className="grid grid-cols-5 gap-1 text-center font-mono text-[9px] font-bold text-slate-500 bg-white p-1.5 border border-slate-100 rounded-lg">
                              <div>
                                <span className="text-[7px] text-slate-400 block font-sans">THEME</span>
                                <span className="text-slate-800">{attempt.themeMatchScore}</span>
                              </div>
                              <div>
                                <span className="text-[7px] text-slate-400 block font-sans">QUAL</span>
                                <span className="text-slate-800">{attempt.qualityScore}</span>
                              </div>
                              <div>
                                <span className="text-[7px] text-slate-400 block font-sans">SIMPLE</span>
                                <span className="text-slate-800">{attempt.simplicityScore}</span>
                              </div>
                              <div>
                                <span className="text-[7px] text-slate-400 block font-sans">EFFORT</span>
                                <span className="text-slate-800">{attempt.effortScore}</span>
                              </div>
                              <div>
                                <span className="text-[7px] text-slate-400 block font-sans">SPAM</span>
                                <span className="text-slate-800">{attempt.spamScore}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-medium">
                              <span>Model: <code className="font-mono text-slate-600">{attempt.modelName}</code></span>
                              {attempt.rejectionCodes && attempt.rejectionCodes.length > 0 && (
                                <span className="text-rose-600 font-extrabold" title={attempt.rejectionCodes.join(", ")}>
                                  {attempt.rejectionCodes.length} Rejections
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeSubmission.validationMetadata && (
                  <div className="space-y-1.5 text-xs text-left">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Audit Pipeline Metadata log</span>
                    <div className="p-3 bg-slate-900 text-slate-300 font-mono text-[10px] rounded-xl overflow-x-auto space-y-1 border border-slate-800 leading-normal">
                      <div>VALIDATOR_VERSION: {(activeSubmission.validationMetadata as any).validatorVersion || "fcbc-validator-v2"}</div>
                      <div>OPENCLIP_MODEL: {(activeSubmission.validationMetadata as any).openClipModel || "unknown"}</div>
                      <div>VISION_PROVIDER: {(activeSubmission.validationMetadata as any).visionProvider || "google-gemini-api"}</div>
                      <div>VISION_MODEL: {(activeSubmission.validationMetadata as any).visionModel || "gemini-2.5-flash"}</div>
                      <div>THRESHOLDS_VERSION: {(activeSubmission.validationMetadata as any).thresholdsConfigVersion || "mvp-defaults-v1"}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Overrides & Catalog approvals dashboard */}
            <div className="border-t border-slate-200 pt-4.5 space-y-4 shrink-0 bg-white">
              {/* Administrative Note */}
              <div className="space-y-1 text-xs text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Administrative Note (Audit Log)</label>
                <input
                  type="text"
                  value={individualReason}
                  onChange={(e) => setIndividualReason(e.target.value)}
                  placeholder="Provide context or explanation for review/ingestion decision..."
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3.5 py-2.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons grid */}
              <div className="space-y-3 pb-4 border-b border-slate-100 text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">ADMIN DECISION ACTIONS</span>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => handleIndividualStatusChange(activeSubmission.id, "accepted")}
                    disabled={isPending || activeSubmission.validationStatus === "accepted"}
                    className="flex-1 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-sm text-center"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleIndividualStatusChange(activeSubmission.id, "needs_review")}
                    disabled={isPending || activeSubmission.validationStatus === "needs_review"}
                    className="flex-1 rounded-lg bg-amber-500 px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-amber-400 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-sm text-center"
                  >
                    Needs Review
                  </button>
                  <button
                    onClick={() => handleIndividualStatusChange(activeSubmission.id, "rejected")}
                    disabled={isPending || activeSubmission.validationStatus === "rejected"}
                    className="flex-1 rounded-lg bg-rose-600 px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-rose-500 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-sm text-center"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Dataset Catalog Section */}
              <div className="space-y-3.5 text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">SAVE TO TRAINING DATASET</span>
                
                {activeSubmission.savedToDataset ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 font-bold flex items-center gap-2">
                    <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>✓ Already enrolled in a model style dataset version.</span>
                  </div>
                ) : activeSubmission.validationStatus !== "accepted" ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 font-medium flex gap-2">
                    <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>⚠️ Submissions must be Accepted before they can be saved to the training dataset. Accept the submission above to unlock cataloging.</span>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Select Artist */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Artist Style</label>
                      <select
                        value={selectedArtistId}
                        onChange={(e) => {
                          const artistId = e.target.value;
                          setSelectedArtistId(artistId);
                          setSelectedVersionId("");
                          setSelectedLicenseId("");
                        }}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3.5 py-2.5 text-slate-700 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Choose target style...</option>
                        {artists.map((artist: any) => (
                          <option key={artist.id} value={artist.id}>
                            {artist.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Dataset Version */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dataset Version</label>
                      <select
                        value={selectedVersionId}
                        onChange={(e) => setSelectedVersionId(e.target.value)}
                        disabled={!selectedArtistId}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3.5 py-2.5 text-slate-700 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                      >
                        <option value="">Choose dataset version...</option>
                        {(datasetVersions || [])
                          .filter((v: any) => v.artistId === selectedArtistId)
                          .map((v: any) => (
                            <option key={v.id} value={v.id}>
                              {v.versionName} ({v.status})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Select License Record */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">License / Consent Record (Optional)</label>
                      <select
                        value={selectedLicenseId}
                        onChange={(e) => setSelectedLicenseId(e.target.value)}
                        disabled={!selectedArtistId}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3.5 py-2.5 text-slate-700 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                      >
                        <option value="">None selected / optional...</option>
                        {(licenseRecords || [])
                          .filter((l: any) => l.artistId === selectedArtistId)
                          .map((l: any) => (
                            <option key={l.id} value={l.id}>
                              {l.recordType} - {l.rightsBasis} ({l.commercialAllowed ? "Commercial" : "Non-commercial"})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Consent Warning Checkbox */}
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-950 space-y-3 font-medium">
                      <p className="leading-relaxed">
                        <strong>Consent Check Warning:</strong> Only save submissions to a training dataset if the creator has agreed that their uploaded image can be used for AI training or prototype model improvement. Semantic similarity alone is not enough for legal or ethical dataset inclusion.
                      </p>
                      <label className="flex items-start gap-2.5 cursor-pointer text-[11px] font-bold text-indigo-900 leading-normal">
                        <input
                          type="checkbox"
                          checked={consentChecked}
                          onChange={(e) => setConsentChecked(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer mt-0.5 accent-indigo-600"
                        />
                        <span>I verify that legal consent has been obtained for this submission.</span>
                      </label>
                    </div>

                    {/* Save to Dataset button */}
                    <button
                      onClick={() => handleSaveToDataset(activeSubmission.id)}
                      disabled={isPending || !selectedArtistId || !selectedVersionId || !consentChecked}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      {isPending ? "Ingesting..." : "Save to Dataset"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal for bulk operations */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6.5 space-y-5 animate-scaleUp text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight flex items-center gap-1.5 uppercase tracking-wide">
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Confirm Bulk Action
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mt-2 font-medium">
                You are about to execute a bulk update on{" "}
                <strong className="text-indigo-600 font-extrabold">{getSelectedCount()}</strong> selected submissions.
              </p>
              {isAllPagesSelected && (
                <div className="rounded-lg bg-amber-50 border border-amber-200/50 p-3.5 text-xs text-amber-800 mt-3 font-medium space-y-1">
                  <p className="font-extrabold">⚠️ Warning: Cross-page matching selected!</p>
                  <p className="leading-normal">
                    This will run on matching filtered results across the entire paginated database, not just the visible page. This process cannot be undone.
                  </p>
                </div>
              )}

              {bulkActionType === "revalidate" && (
                <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-950 space-y-1.5 mt-3">
                  <p className="font-extrabold text-indigo-900 uppercase tracking-wider text-[10px]">GCP Vertex AI Cost & Volume Forecast</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">Provider:</span>{" "}
                      <span className="font-mono font-bold">{estimation?.providerName || "Fetching..."}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Active Model:</span>{" "}
                      <span className="font-mono font-bold">{estimation?.modelName || "Fetching..."}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">API Requests:</span>{" "}
                      <span className="font-bold text-slate-800">{estimation?.expectedRequests ?? "..."} calls</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Estimated Cost:</span>{" "}
                      <span className="font-mono font-bold text-emerald-600">${estimation?.estimatedCostUsd !== undefined ? estimation.estimatedCostUsd.toFixed(5) : "..."} USD</span>
                    </div>
                  </div>
                  {estimation?.warningMessage && (
                    <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded font-medium mt-1 leading-normal text-[10px]">
                      {estimation.warningMessage}
                    </div>
                  )}
                </div>
              )}

            </div>

            <form onSubmit={handleBulkActionSubmit} className="space-y-4">
              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bulk reason (optional)</label>
                <input
                  type="text"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Describe context for bulk change..."
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {isAllPagesSelected && (
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Security verification: Type <span className="font-mono font-black text-rose-600 bg-rose-50 border border-rose-100 rounded px-1">CONFIRM</span> to authorize
                  </label>
                  <input
                    type="text"
                    value={bulkConfirmationInput}
                    onChange={(e) => setBulkConfirmationInput(e.target.value)}
                    required
                    placeholder="Type CONFIRM here..."
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {actionError && <p className="text-xs text-red-600 font-bold mt-1">{actionError}</p>}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAllBulkModalOpen(false);
                    setBulkReason("");
                    setBulkActionValue("");
                    setBulkConfirmationInput("");
                    setActionError(null);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || (isAllPagesSelected && bulkConfirmationInput !== "CONFIRM")}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-indigo-500 shadow-sm transition-all cursor-pointer text-center disabled:opacity-30 disabled:pointer-events-none"
                >
                  {isPending ? "Executing..." : "Confirm Execution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
