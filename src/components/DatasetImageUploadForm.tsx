"use client";

import React, { useState, useRef } from "react";
import { Artist, DatasetVersion, ConsentOrLicenseRecord } from "@prisma/client";
import { uploadDatasetImages } from "@/app/admin/datasets/actions";

interface DatasetImageUploadFormProps {
  artists: Artist[];
  allDatasetVersions: DatasetVersion[];
  allLicenseRecords: ConsentOrLicenseRecord[];
}

export default function DatasetImageUploadForm({
  artists,
  allDatasetVersions,
  allLicenseRecords,
}: DatasetImageUploadFormProps) {
  // 1. Core State
  const [artistId, setArtistId] = useState(() => artists[0]?.id || "");
  const [datasetVersionId, setDatasetVersionId] = useState(() => {
    const initialArtistId = artists[0]?.id || "";
    const versions = allDatasetVersions.filter((v) => v.artistId === initialArtistId);
    return versions[0]?.id || "";
  });
  const [licenseRecordId, setLicenseRecordId] = useState("");
  const [sharedCaption, setSharedCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // 2. Interaction & Status State
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 3. Filtered selectors State
  const [filteredVersions, setFilteredVersions] = useState<DatasetVersion[]>(() => {
    const initialArtistId = artists[0]?.id || "";
    return allDatasetVersions.filter((v) => v.artistId === initialArtistId);
  });
  const [filteredLicenses, setFilteredLicenses] = useState<ConsentOrLicenseRecord[]>(() => {
    const initialArtistId = artists[0]?.id || "";
    return allLicenseRecords.filter((l) => l.artistId === initialArtistId);
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4. Cascade logic on Artist Selection
  const handleArtistChange = (id: string) => {
    setArtistId(id);
    setError(null);
    setSuccessMessage(null);

    // Cascade dataset versions
    const versions = allDatasetVersions.filter((v) => v.artistId === id);
    setFilteredVersions(versions);
    if (versions.length > 0) {
      setDatasetVersionId(versions[0].id);
    } else {
      setDatasetVersionId("");
    }

    // Cascade licenses
    const licenses = allLicenseRecords.filter((l) => l.artistId === id);
    setFilteredLicenses(licenses);
    setLicenseRecordId(""); // Reset optional license dropdown
  };

  // 5. Drag event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  // 6. Handle file dropping
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setError(null);
    setSuccessMessage(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  // 7. Handle file dialog choice
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMessage(null);
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(e.target.files);
    }
  };

  // 8. Add files with client-side extension validation
  const processSelectedFiles = (selectedFiles: FileList) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const validFiles: File[] = [];
    let rejectedFilesCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        // Prevent duplicate files in the current local queue
        if (!files.some((f) => f.name === file.name && f.size === file.size)) {
          validFiles.push(file);
        }
      } else {
        rejectedFilesCount++;
      }
    }

    if (rejectedFilesCount > 0) {
      setError(`${rejectedFilesCount} file(s) rejected. Only .jpg, .jpeg, .png, and .webp images are supported.`);
    }

    setFiles((prev) => [...prev, ...validFiles]);
  };

  // 9. Remove file from the list
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 10. Clear entire file list
  const clearQueue = () => {
    setFiles([]);
    setError(null);
    setSuccessMessage(null);
  };

  // 11. Trigger file click
  const triggerFileDialog = () => {
    fileInputRef.current?.click();
  };

  // 12. Submit upload
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!artistId) {
      setError("Please select an artist.");
      return;
    }
    if (!datasetVersionId) {
      setError("Please select a dataset version.");
      return;
    }
    if (files.length === 0) {
      setError("Please add at least one image file to upload.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("artistId", artistId);
      formData.append("datasetVersionId", datasetVersionId);
      if (licenseRecordId) {
        formData.append("licenseRecordId", licenseRecordId);
      }
      formData.append("sharedCaption", sharedCaption);
      files.forEach((file) => {
        formData.append("files", file);
      });

      const res = await uploadDatasetImages(formData);

      if (res.success) {
        setSuccessMessage(`Successfully uploaded and cataloged ${res.count} image(s).`);
        setFiles([]);
        setSharedCaption("");
      } else {
        setError(res.error || "Failed to upload images.");
      }
    } catch (err) {
      console.error("Batch upload client error:", err);
      setError("An unexpected error occurred during upload. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-slate-900">
      {/* Card Header */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <svg className="h-5 w-5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <div>
          <h2 className="text-base font-bold text-slate-800">Drag-and-Drop Upload</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Upload local style training images recursively</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Alerts */}
        {successMessage && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3.5 text-emerald-800 flex items-start gap-2.5">
            <svg className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-xs">Upload Completed</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-100 p-3.5 text-rose-800 flex items-start gap-2.5">
            <svg className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-xs">Error Processing Files</p>
              <p className="text-[11px] text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* 1. Artist Selection */}
        <div className="space-y-1">
          <label htmlFor="upload-artist" className="block text-xs font-semibold text-slate-700">
            Artist <span className="text-rose-500">*</span>
          </label>
          <select
            id="upload-artist"
            value={artistId}
            onChange={(e) => handleArtistChange(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
          >
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Dataset Version Selection */}
        <div className="space-y-1">
          <label htmlFor="upload-version" className="block text-xs font-semibold text-slate-700">
            Dataset Version <span className="text-rose-500">*</span>
          </label>
          <select
            id="upload-version"
            value={datasetVersionId}
            onChange={(e) => {
              setDatasetVersionId(e.target.value);
              setError(null);
            }}
            disabled={isSubmitting || filteredVersions.length === 0}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors disabled:opacity-60"
          >
            {filteredVersions.length === 0 ? (
              <option value="">No versions available</option>
            ) : (
              filteredVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.versionName}
                </option>
              ))
            )}
          </select>
        </div>

        {/* 3. License Record Selection */}
        <div className="space-y-1">
          <label htmlFor="upload-license" className="block text-xs font-semibold text-slate-700">
            License/Consent Record
          </label>
          <select
            id="upload-license"
            value={licenseRecordId}
            onChange={(e) => {
              setLicenseRecordId(e.target.value);
              setError(null);
            }}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
          >
            <option value="">None / Not Selected</option>
            {filteredLicenses.map((l) => (
              <option key={l.id} value={l.id}>
                {l.rightsBasis} ({l.recordType}) - {l.sourceName || "No Source"}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-slate-100 my-2 pt-2"></div>

        {/* 4. Drag & Drop Zone */}
        <div className="space-y-1.5">
          <span className="block text-xs font-semibold text-slate-700">
            Style Images <span className="text-rose-500">*</span>
          </span>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileDialog}
            className={`relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-indigo-500 bg-indigo-50/50"
                : "border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-slate-50/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              disabled={isSubmitting}
              className="hidden"
            />
            <div className="space-y-1.5">
              <svg className="mx-auto h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="text-xs text-slate-500">
                <span className="font-bold text-indigo-600">Drag files here</span> or click to browse
              </div>
              <p className="text-[10px] text-slate-400">Supports PNG, JPEG, and WebP only</p>
            </div>
          </div>
        </div>

        {/* 5. File Queue List */}
        {files.length > 0 && (
          <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                <span className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                  {files.length}
                </span>
                Files Selected
              </span>
              <button
                type="button"
                onClick={clearQueue}
                disabled={isSubmitting}
                className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer disabled:text-slate-400"
              >
                Clear Queue
              </button>
            </div>
            <ul className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-slate-100/50 pr-1">
              {files.map((file, idx) => {
                const sizeInKb = (file.size / 1024).toFixed(1);
                return (
                  <li key={`${file.name}-${idx}`} className="flex items-center justify-between pt-1.5 first:pt-0 text-[11px]">
                    <span className="truncate text-slate-700 font-mono max-w-[180px]" title={file.name}>
                      {file.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400">{sizeInKb} KB</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        disabled={isSubmitting}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* 6. Optional Shared Caption Prefix */}
        <div className="space-y-1">
          <label htmlFor="upload-caption" className="block text-xs font-semibold text-slate-700">
            Shared Caption Prefix
          </label>
          <input
            id="upload-caption"
            type="text"
            placeholder="e.g., A woodblock print of... (optional)"
            value={sharedCaption}
            onChange={(e) => setSharedCaption(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
          />
          <p className="text-[10px] text-slate-400">
            Applied to all images in this upload batch.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || files.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Uploading {files.length} Files...
            </>
          ) : (
            `Upload ${files.length} Image(s)`
          )}
        </button>
      </form>
    </div>
  );
}
