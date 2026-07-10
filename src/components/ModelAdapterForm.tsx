"use client";

import React, { useState } from "react";
import { registerModelAdapter } from "@/app/admin/adapters/actions";

interface ArtistLite {
  id: string;
  displayName: string;
  slug: string;
}

interface DatasetVersionLite {
  id: string;
  versionName: string;
  artistId: string;
}

interface ModelAdapterFormProps {
  artists: ArtistLite[];
  allDatasetVersions: DatasetVersionLite[];
}

export default function ModelAdapterForm({
  artists,
  allDatasetVersions,
}: ModelAdapterFormProps) {
  // 1. Core Form States initialized synchronously
  const [artistId, setArtistId] = useState(() => artists[0]?.id || "");
  const [datasetVersionId, setDatasetVersionId] = useState("");
  
  const [adapterName, setAdapterName] = useState(() => {
    const initialArtist = artists[0];
    return initialArtist ? `${initialArtist.displayName} LoRA v1` : "";
  });
  const [baseModel, setBaseModel] = useState("stable-diffusion-1.5");
  const [adapterType, setAdapterType] = useState("lora");
  
  const [filePath, setFilePath] = useState(() => {
    const initialArtist = artists[0];
    return initialArtist ? `models/adapters/${initialArtist.slug}-lora-v1.safetensors` : "";
  });
  
  const [triggerToken, setTriggerToken] = useState(() => {
    const initialArtist = artists[0];
    return initialArtist ? `style of ${initialArtist.slug}` : "";
  });
  
  const [status, setStatus] = useState("registered");
  const [trainingNotebookUrl, setTrainingNotebookUrl] = useState("");

  // 2. Control & Override states
  const [isNameEdited, setIsNameEdited] = useState(false);
  const [isPathEdited, setIsPathEdited] = useState(false);
  const [isTokenEdited, setIsTokenEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 3. Filtered selections initialized synchronously
  const [filteredVersions, setFilteredVersions] = useState<DatasetVersionLite[]>(() => {
    const initialArtistId = artists[0]?.id || "";
    return allDatasetVersions.filter((v) => v.artistId === initialArtistId);
  });

  // 4. Auto-populate fields dynamically
  const autoPopulateFields = (id: string, nameOverride = false, pathOverride = false, tokenOverride = false) => {
    const artist = artists.find((a) => a.id === id);
    if (!artist) return;

    const displayName = artist.displayName;
    const slug = artist.slug;

    if (!nameOverride) {
      setAdapterName(`${displayName} LoRA v1`);
    }
    if (!pathOverride) {
      setFilePath(`models/adapters/${slug}-lora-v1.safetensors`);
    }
    if (!tokenOverride) {
      setTriggerToken(`style of ${slug}`);
    }
  };

  // 5. Custom Artist Change Cascader
  const handleArtistChange = (id: string) => {
    setArtistId(id);
    setError(null);
    setSuccess(false);

    // Filter versions
    const versions = allDatasetVersions.filter((v) => v.artistId === id);
    setFilteredVersions(versions);
    setDatasetVersionId(""); // Default optional field to None

    // Trigger auto-population
    autoPopulateFields(id, isNameEdited, isPathEdited, isTokenEdited);
  };

  // 6. Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // Frontend validations
    if (!artistId) {
      setError("Artist selection is required.");
      setIsSubmitting(false);
      return;
    }
    if (!adapterName.trim()) {
      setError("Adapter name is required.");
      setIsSubmitting(false);
      return;
    }
    if (!baseModel.trim()) {
      setError("Base model selection is required.");
      setIsSubmitting(false);
      return;
    }
    if (!adapterType.trim()) {
      setError("Adapter type is required.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      artistId,
      datasetVersionId: datasetVersionId || null,
      adapterName: adapterName.trim(),
      baseModel: baseModel.trim(),
      adapterType: adapterType.trim(),
      filePath: filePath.trim() || null,
      triggerToken: triggerToken.trim() || null,
      status,
      trainingNotebookUrl: trainingNotebookUrl.trim() || null,
    };

    const res = await registerModelAdapter(payload);

    if (res.success) {
      setSuccess(true);
      
      // Reset text inputs and override states, keep dropdown states
      setIsNameEdited(false);
      setIsPathEdited(false);
      setIsTokenEdited(false);
      setTrainingNotebookUrl("");

      // Re-trigger auto-population with clean flags for the current artist
      autoPopulateFields(artistId, false, false, false);
    } else {
      setError(res.error || "An unexpected error occurred during registration.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 text-slate-900 transition-all duration-200">
      <div className="border-b border-slate-100 pb-4 mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800">Register Style Adapter</h2>
          <p className="text-xs text-slate-400">Map and register custom LoRA safetensors configuration for styles</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Status Messages */}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 text-emerald-800 flex items-start gap-3">
            <svg className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-bold text-sm">Model Adapter Registered</p>
              <p className="text-xs text-emerald-600 mt-0.5">The model adapter config has been cataloged. Audit logs have been generated.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-100 p-4 text-rose-800 flex items-start gap-3">
            <svg className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-bold text-sm">Registration Failed</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Form Fields Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Column 1 */}
          <div className="space-y-4">
            
            {/* 1. Artist Selection */}
            <div className="space-y-1">
              <label htmlFor="form-artist" className="block text-xs font-semibold text-slate-700">
                Artist Style <span className="text-rose-500">*</span>
              </label>
              <select
                id="form-artist"
                value={artistId}
                onChange={(e) => handleArtistChange(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
              >
                <option value="" disabled>Select Artist Style</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Dataset Version */}
            <div className="space-y-1">
              <label htmlFor="form-version" className="block text-xs font-semibold text-slate-700">
                Dataset Version <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                id="form-version"
                value={datasetVersionId}
                onChange={(e) => {
                  setDatasetVersionId(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
              >
                <option value="">None / Independent</option>
                {filteredVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.versionName}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Base Model Selection */}
            <div className="space-y-1">
              <label htmlFor="form-base-model" className="block text-xs font-semibold text-slate-700">
                Base Model weights <span className="text-rose-500">*</span>
              </label>
              <select
                id="form-base-model"
                value={baseModel}
                onChange={(e) => {
                  setBaseModel(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
              >
                <option value="stable-diffusion-1.5">Stable Diffusion 1.5</option>
                <option value="stable-diffusion-xl">Stable Diffusion XL (SDXL)</option>
                <option value="flux-1-dev">FLUX.1 Dev</option>
                <option value="custom">Custom Baseline Weights</option>
              </select>
            </div>

            {/* 4. Adapter Type */}
            <div className="space-y-1">
              <label htmlFor="form-adapter-type" className="block text-xs font-semibold text-slate-700">
                Adapter Type <span className="text-rose-500">*</span>
              </label>
              <select
                id="form-adapter-type"
                value={adapterType}
                onChange={(e) => {
                  setAdapterType(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
              >
                <option value="lora">LoRA (Low-Rank Adaptation)</option>
                <option value="ti">Textual Inversion (TI Embedding)</option>
                <option value="lycoris">LyCORIS</option>
                <option value="hypernetwork">Hypernetwork</option>
              </select>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            
            {/* 5. Adapter Name */}
            <div className="space-y-1">
              <label htmlFor="form-adapter-name" className="block text-xs font-semibold text-slate-700">
                Adapter Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="form-adapter-name"
                type="text"
                required
                placeholder="e.g. Katsushika Hokusai LoRA v1"
                value={adapterName}
                onChange={(e) => {
                  setAdapterName(e.target.value);
                  setIsNameEdited(true);
                  setError(null);
                  setSuccess(false);
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            {/* 6. Safetensors File Path */}
            <div className="space-y-1">
              <label htmlFor="form-filepath" className="block text-xs font-semibold text-slate-700">
                Adapter File Storage Path <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="form-filepath"
                type="text"
                placeholder="e.g. models/adapters/hokusai-lora-v1.safetensors"
                value={filePath}
                onChange={(e) => {
                  setFilePath(e.target.value);
                  setIsPathEdited(true);
                  setError(null);
                  setSuccess(false);
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            {/* 7. Trigger Token */}
            <div className="space-y-1">
              <label htmlFor="form-token" className="block text-xs font-semibold text-slate-700">
                Trigger Token / Keyword <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="form-token"
                type="text"
                placeholder="e.g. style of hokusai"
                value={triggerToken}
                onChange={(e) => {
                  setTriggerToken(e.target.value);
                  setIsTokenEdited(true);
                  setError(null);
                  setSuccess(false);
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            {/* 8. Deployment Status */}
            <div className="space-y-1">
              <label htmlFor="form-status" className="block text-xs font-semibold text-slate-700">
                Deployment Status
              </label>
              <select
                id="form-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
              >
                <option value="placeholder_registered">Placeholder Registered</option>
                <option value="registered">Registered</option>
                <option value="training">Training Style Adapter</option>
                <option value="ready">Ready (Active for Generation)</option>
                <option value="disabled">Disabled</option>
                <option value="failed">Failed / Error State</option>
              </select>
            </div>
          </div>
        </div>

        {/* 9. Training Notebook URL */}
        <div className="space-y-1 pt-1">
          <label htmlFor="form-notebook" className="block text-xs font-semibold text-slate-700">
            Training Notebook URL / Run Link <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            id="form-notebook"
            type="url"
            placeholder="e.g. https://colab.research.google.com/drive/... (Notebook / Run Logs)"
            value={trainingNotebookUrl}
            onChange={(e) => {
              setTrainingNotebookUrl(e.target.value);
              setError(null);
              setSuccess(false);
            }}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Cataloging Weight Adapter...
            </>
          ) : (
            "Register Adapter Metadata"
          )}
        </button>
      </form>
    </div>
  );
}
