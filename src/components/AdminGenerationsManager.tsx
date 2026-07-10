"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { GenerationRequest, Artist, ModelAdapter, DatasetVersion } from "@prisma/client";
import { StatusBadge, EmptyState } from "./admin-helpers";
import { manuallyCompleteGeneration } from "@/app/admin/generations/actions";

type GenerationWithRelations = GenerationRequest & {
  artist: Artist;
  modelAdapter: ModelAdapter | null;
  datasetVersion: DatasetVersion | null;
};

interface AdminGenerationsManagerProps {
  initialGenerations: GenerationWithRelations[];
}

/**
 * Image element equipped with local error state.
 * Triggers fallback language if file fails to load.
 */
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

  useEffect(() => {
    setHasError(false); // Reset error state if image src changes
  }, [src]);

  if (hasError) {
    return (
      <div className="text-xs text-rose-600 font-mono bg-rose-50 p-4 border border-rose-100 rounded-xl leading-normal break-all">
        ⚠️ Image preview unavailable.
        <div className="mt-2 text-[10px] text-slate-500 font-sans">Stored path:</div>
        <span className="font-bold underline text-rose-700">{src}</span>
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

export default function AdminGenerationsManager({ initialGenerations }: AdminGenerationsManagerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [generations, setGenerations] = useState<GenerationWithRelations[]>(initialGenerations);
  const [selectedGen, setSelectedGen] = useState<GenerationWithRelations | null>(null);

  // Sync state if initialGenerations updates
  useEffect(() => {
    setGenerations(initialGenerations);
    if (selectedGen) {
      const updated = initialGenerations.find((g) => g.id === selectedGen.id);
      if (updated) setSelectedGen(updated);
    }
  }, [initialGenerations]);

  // Read status filter from searchParams and setup local state
  const queryFilter = searchParams.get("status") || "all";
  const [activeTab, setActiveTab] = useState<string>(queryFilter);

  useEffect(() => {
    setActiveTab(queryFilter);
  }, [queryFilter]);

  // Handle Tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "all") {
      params.delete("status");
    } else {
      params.set("status", tab);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Form State
  const [isPending, startTransition] = useTransition();
  const [outputImagePath, setOutputImagePath] = useState("");
  const [finalSeed, setFinalSeed] = useState<string>("");
  const [parametersJson, setParametersJson] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // New Upload States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Pre-fill form fields when selection changes
  useEffect(() => {
    if (selectedGen) {
      setOutputImagePath(selectedGen.outputImagePath || "");
      setFinalSeed(selectedGen.seed !== null && selectedGen.seed !== undefined ? String(selectedGen.seed) : "");
      setParametersJson(
        selectedGen.parametersJson
          ? JSON.stringify(selectedGen.parametersJson, null, 2)
          : ""
      );
      setAdminNote("");
      setImageFile(null);
      setUploadPreview(null);
      setFormError(null);
      setFormSuccess(null);

      // Reset file input element if it exists
      const fileInput = document.getElementById("form-output-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  }, [selectedGen]);

  // Filtered Generations
  const filteredGenerations = generations.filter((gen) => {
    if (activeTab === "all") return true;
    return gen.status === activeTab;
  });

  // Handle Form Submission
  const handleSubmitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGen) return;

    if (!imageFile && !outputImagePath.trim()) {
      setFormError("Either an uploaded image file or an output path/URL is required.");
      return;
    }

    setFormError(null);
    setFormSuccess(null);

    const formData = new FormData();
    formData.append("generationRequestId", selectedGen.id);
    formData.append("seed", finalSeed.trim());
    formData.append("parametersJson", parametersJson.trim());
    formData.append("adminNote", adminNote.trim());

    if (imageFile) {
      formData.append("imageFile", imageFile);
    } else {
      formData.append("outputImagePath", outputImagePath.trim());
    }

    startTransition(async () => {
      const res = await manuallyCompleteGeneration(formData);

      if (res.success) {
        setFormSuccess(
          `Successfully completed request! ${
            res.royaltyCreated
              ? "Created JPY 50 simulated royalty event."
              : "Pre-existing royalty event preserved."
          }`
        );
        setImageFile(null);
        setUploadPreview(null);
        const fileInput = document.getElementById("form-output-file") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        
        // Refresh local cache via router.refresh
        router.refresh();
      } else {
        setFormError(res.error || "An unknown error occurred.");
      }
    });
  };

  // Quick Copy Helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copied ${label} to clipboard!`);
  };

  return (
    <div className="grid grid-cols-12 gap-8 items-start">
      {/* LEFT SECTION: LIST & FILTERS (col-span-12 or lg:col-span-7) */}
      <div className="col-span-12 lg:col-span-7 space-y-6">
        {/* Manual Workflow Instructions Banner */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-slate-50 p-6 shadow-sm">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-950">Manual Completion Engine</h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Use this manual completion workflow when real LoRA inference is performed outside the web app, for example in Colab or Kaggle. Paste the generated image URL or storage path here to attach the real result to the generation request and trigger the simulated royalty ledger.
              </p>
            </div>
          </div>
        </div>

        {/* External LoRA Inference Guide Banner */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <span>⚙️ External LoRA Inference Workflow</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            For the no-paid-GPU prototype, run real LoRA inference externally in Colab or Kaggle, then paste the generated image result back into this page.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs pt-1">
            <a
              href="file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/ml/lora_inference/README.md"
              className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5"
            >
              📖 View Guide README
            </a>
            <span className="text-slate-300">|</span>
            <a
              href="file:///Users/danielebiggi/Desktop/fcbc-main/creator-style-lab/ml/lora_inference/lora_inference_template.md"
              className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5"
            >
              📓 Copy Notebook Template
            </a>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {["all", "queued", "completed", "failed"].map((tab) => {
              const count = generations.filter((g) => tab === "all" || g.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    activeTab === tab
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                  }`}
                >
                  <span className="capitalize">{tab}</span>
                  <span className={`ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full ${
                    activeTab === tab ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredGenerations.length} of {generations.length} total requests
          </span>
        </div>

        {/* Generations List Table / Cards */}
        {filteredGenerations.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Render</th>
                    <th className="px-5 py-3">Artist Style</th>
                    <th className="px-5 py-3">Prompt</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-600">
                  {filteredGenerations.map((gen) => {
                    const isSelected = selectedGen?.id === gen.id;
                    const isCompleted = gen.status === "completed";
                    const isFailed = gen.status === "failed";

                    return (
                      <tr
                        key={gen.id}
                        onClick={() => setSelectedGen(gen)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-indigo-50/50 hover:bg-indigo-50/60"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        {/* Thumbnail render */}
                        <td className="px-5 py-3">
                          {isCompleted && gen.outputImagePath ? (
                            <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-sm shrink-0">
                              <img
                                src={gen.outputImagePath}
                                alt="Th"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : isFailed ? (
                            <div className="h-10 w-10 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-lg border border-amber-200 bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            </div>
                          )}
                        </td>

                        {/* Artist */}
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{gen.artist.displayName}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{gen.id}</span>
                        </td>

                        {/* Prompt */}
                        <td className="px-5 py-3 max-w-[200px] md:max-w-xs">
                          <p className="text-xs font-medium text-slate-800 line-clamp-2" title={gen.prompt}>
                            {gen.prompt}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3 whitespace-nowrap">
                          <StatusBadge status={gen.status} />
                        </td>

                        {/* Action buttons */}
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGen(gen);
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-700 border-slate-300 hover:border-indigo-600 hover:text-indigo-600"
                            }`}
                          >
                            Inspect
                          </button>
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
            message={`No requests found matching status "${activeTab}"`}
            subtitle="Trigger requests inside the generator, or select a different filter."
          />
        )}
      </div>

      {/* RIGHT SECTION: DETAILS, COPY PANEL & FORM (col-span-12 or lg:col-span-5) */}
      <div className="col-span-12 lg:col-span-5">
        {selectedGen ? (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            {/* Panel Header */}
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                  ID: {selectedGen.id}
                </span>
                <StatusBadge status={selectedGen.status} />
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-950">Inference Inspector</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Requested on {new Date(selectedGen.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Prompt details */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Prompt</label>
                <p className="mt-1 text-xs font-semibold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm leading-relaxed">
                  {selectedGen.prompt}
                </p>
              </div>
              {selectedGen.negativePrompt && (
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Negative Prompt</label>
                  <p className="mt-1 text-xs font-medium text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm leading-relaxed">
                    {selectedGen.negativePrompt}
                  </p>
                </div>
              )}
            </div>

            {/* Notebook copy helper panel */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">📋 Notebook Inference Helper</span>
                <span className="text-[10px] text-slate-400">Copy parameters to Colab/Kaggle</span>
              </div>
              <div className="text-xs space-y-2.5">
                <div className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="overflow-hidden">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Artist Name</div>
                    <div className="font-semibold text-slate-800 truncate">{selectedGen.artist.displayName}</div>
                  </div>
                  <button
                    onClick={() => handleCopyText(selectedGen.artist.displayName, "Artist Name")}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Copy
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="overflow-hidden">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Adapter File Path</div>
                    <div className="font-mono text-[10px] text-slate-700 truncate">
                      {selectedGen.modelAdapter?.filePath || "models/adapters/hokusai-lora-v1.safetensors"}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleCopyText(
                        selectedGen.modelAdapter?.filePath || "models/adapters/hokusai-lora-v1.safetensors",
                        "Adapter File Path"
                      )
                    }
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Copy
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="overflow-hidden">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Trigger Token</div>
                    <div className="font-mono text-[10px] text-indigo-700 font-bold truncate">
                      {selectedGen.modelAdapter?.triggerToken || "hokusai_style"}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleCopyText(
                        selectedGen.modelAdapter?.triggerToken || "hokusai_style",
                        "Trigger Token"
                      )
                    }
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Copy
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="overflow-hidden">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Inference Prompt</div>
                    <div className="text-slate-800 font-semibold truncate leading-snug">{selectedGen.prompt}</div>
                  </div>
                  <button
                    onClick={() => handleCopyText(selectedGen.prompt, "Inference Prompt")}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Copy
                  </button>
                </div>

                {selectedGen.seed !== null && (
                  <div className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded border border-slate-100">
                    <div className="overflow-hidden">
                      <div className="text-[9px] uppercase font-bold text-slate-400">Seed</div>
                      <div className="font-mono text-slate-800">{selectedGen.seed}</div>
                    </div>
                    <button
                      onClick={() => handleCopyText(String(selectedGen.seed), "Seed")}
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Output Image Preview Section */}
            {selectedGen.outputImagePath && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Render Output</label>
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-2 shadow-inner flex items-center justify-center min-h-[150px]">
                  <ImageWithFallback
                    src={selectedGen.outputImagePath}
                    alt="Manually attached output image"
                    className="max-h-[300px] w-full object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Manual Completion Form */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
                {selectedGen.status === "completed"
                  ? "Update Complete Record"
                  : "Manually Attach Result & Log Royalty"}
              </h4>

              <form onSubmit={handleSubmitCompletion} className="space-y-4">
                {/* Optional Output Image File Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Upload Output Image File <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="form-output-file"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        setImageFile(file);
                        const url = URL.createObjectURL(file);
                        setUploadPreview(url);
                      } else {
                        setImageFile(null);
                        setUploadPreview(null);
                      }
                    }}
                    className="mt-1 w-full text-xs font-medium rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    If uploaded, the image file is saved under <code>public/uploads/generated-results</code>. Fallback path below is bypassed.
                  </p>
                  {uploadPreview && (
                    <div className="mt-2 relative w-20 h-24 rounded border border-slate-200 overflow-hidden bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadPreview}
                        alt="Staged output preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setUploadPreview(null);
                          const input = document.getElementById("form-output-file") as HTMLInputElement;
                          if (input) input.value = "";
                        }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 shadow transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* 1. Output image path */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Output Image Path or URL {!imageFile && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={!imageFile}
                    disabled={!!imageFile}
                    value={outputImagePath}
                    onChange={(e) => setOutputImagePath(e.target.value)}
                    placeholder={imageFile ? "Managed automatically from file upload" : "e.g. /output/hokusai_waves_manual.png or external https URL"}
                    className="mt-1 w-full text-xs font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50"
                  />
                </div>

                {/* 2. Optional Final Seed */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Final Seed (Optional)
                  </label>
                  <input
                    type="number"
                    value={finalSeed}
                    onChange={(e) => setFinalSeed(e.target.value)}
                    placeholder="e.g. 427932840"
                    className="mt-1 w-full text-xs font-medium rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* 3. Optional Parameters JSON */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Parameters JSON (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={parametersJson}
                    onChange={(e) => setParametersJson(e.target.value)}
                    placeholder='e.g. { "steps": 30, "guidanceScale": 7.5 }'
                    className="mt-1 w-full font-mono text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* 4. Optional Admin Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Admin Note
                  </label>
                  <textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Trained LoRA externally in Google Colab; pasted result manually."
                    className="mt-1 w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Alerts */}
                {formError && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 font-medium">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 font-medium leading-relaxed animate-fade-in">
                    {formSuccess}
                  </div>
                )}

                {/* Submit Trigger */}
                <button
                  type="submit"
                  disabled={isPending}
                  className={`w-full py-2.5 px-4 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer transition-all hover:shadow-lg ${
                    isPending
                      ? "bg-slate-400 border-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300"
                  }`}
                >
                  {isPending ? "Manually saving weights..." : "Manually Complete Generation"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="h-full rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center flex flex-col items-center justify-center shadow-inner py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-200 shadow-sm">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-900">No Request Selected</h3>
            <p className="mt-2 text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
              Select any request from the log table to review parameters, copy copy-paste helper blocks, or attach manual inference images.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
