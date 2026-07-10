"use client";

import React, { useState } from "react";
import { Artist, DatasetVersion, ConsentOrLicenseRecord } from "@prisma/client";
import { registerDatasetImage } from "@/app/admin/datasets/actions";

interface DatasetImageFormProps {
  artists: Artist[];
  allDatasetVersions: DatasetVersion[];
  allLicenseRecords: ConsentOrLicenseRecord[];
}

export default function DatasetImageForm({
  artists,
  allDatasetVersions,
  allLicenseRecords,
}: DatasetImageFormProps) {
  // 1. Core State
  const [artistId, setArtistId] = useState(() => artists[0]?.id || "");
  const [datasetVersionId, setDatasetVersionId] = useState(() => {
    const initialArtistId = artists[0]?.id || "";
    const versions = allDatasetVersions.filter((v) => v.artistId === initialArtistId);
    return versions[0]?.id || "";
  });
  const [licenseRecordId, setLicenseRecordId] = useState("");
  
  const [filename, setFilename] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [sha256Hash, setSha256Hash] = useState("");
  const [qualityStatus, setQualityStatus] = useState("pending");

  // New Upload States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // 2. Form control state
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPathManuallyEdited, setIsPathManuallyEdited] = useState(false);

  // 3. Filtered selections
  const [filteredVersions, setFilteredVersions] = useState<DatasetVersion[]>(() => {
    const initialArtistId = artists[0]?.id || "";
    return allDatasetVersions.filter((v) => v.artistId === initialArtistId);
  });
  const [filteredLicenses, setFilteredLicenses] = useState<ConsentOrLicenseRecord[]>(() => {
    const initialArtistId = artists[0]?.id || "";
    return allLicenseRecords.filter((l) => l.artistId === initialArtistId);
  });

  // 4. Custom Artist Change Handler - Cascades selections and auto-populates storage path
  const handleArtistChange = (id: string) => {
    setArtistId(id);
    setError(null);
    setSuccess(false);

    // Filter versions
    const versions = allDatasetVersions.filter((v) => v.artistId === id);
    setFilteredVersions(versions);
    if (versions.length > 0) {
      setDatasetVersionId(versions[0].id);
    } else {
      setDatasetVersionId("");
    }

    // Filter licenses
    const licenses = allLicenseRecords.filter((l) => l.artistId === id);
    setFilteredLicenses(licenses);
    setLicenseRecordId(""); // Default optional field to None

    // Update storage path if not manually edited
    if (!isPathManuallyEdited) {
      const artist = artists.find((a) => a.id === id);
      const slug = artist?.slug || "artist";
      setStoragePath(`data/artists/${slug}/v1/raw/${filename}`);
    }
  };

  // 6. Filename change handler - handles storage path auto-populate
  const handleFilenameChange = (val: string) => {
    setFilename(val);
    setError(null);
    setSuccess(false);

    if (!isPathManuallyEdited) {
      const artist = artists.find((a) => a.id === artistId);
      const slug = artist?.slug || "artist";
      setStoragePath(`data/artists/${slug}/v1/raw/${val}`);
    }
  };

  // 7. Storage Path change handler
  const handleStoragePathChange = (val: string) => {
    setStoragePath(val);
    setIsPathManuallyEdited(true);
    setError(null);
    setSuccess(false);
  };

  // 8. Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // Frontend validation
    if (!artistId) {
      setError("Please select an artist.");
      setIsSubmitting(false);
      return;
    }
    if (!datasetVersionId) {
      setError("Please select a dataset version.");
      setIsSubmitting(false);
      return;
    }

    if (!imageFile) {
      if (!filename.trim()) {
        setError("Filename is required when not uploading a file.");
        setIsSubmitting(false);
        return;
      }
      if (!storagePath.trim()) {
        setError("Storage path is required when not uploading a file.");
        setIsSubmitting(false);
        return;
      }
    }

    const widthNum = width.trim() ? parseInt(width, 10) : null;
    const heightNum = height.trim() ? parseInt(height, 10) : null;

    if (widthNum !== null && (isNaN(widthNum) || widthNum <= 0)) {
      setError("Width must be a positive integer.");
      setIsSubmitting(false);
      return;
    }

    if (heightNum !== null && (isNaN(heightNum) || heightNum <= 0)) {
      setError("Height must be a positive integer.");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("artistId", artistId);
    formData.append("datasetVersionId", datasetVersionId);
    formData.append("licenseRecordId", licenseRecordId);
    formData.append("sourceUrl", sourceUrl);
    formData.append("caption", caption);
    formData.append("width", width);
    formData.append("height", height);
    formData.append("sha256Hash", sha256Hash);
    formData.append("qualityStatus", qualityStatus);

    if (imageFile) {
      formData.append("imageFile", imageFile);
    } else {
      formData.append("filename", filename.trim());
      formData.append("storagePath", storagePath.trim());
    }

    const res = await registerDatasetImage(formData);

    if (res.success) {
      setSuccess(true);
      // Reset only fields that vary per image, keep dropdowns and statuses
      setFilename("");
      setImageFile(null);
      setUploadPreview(null);
      setIsPathManuallyEdited(false);
      setSourceUrl("");
      setCaption("");
      setWidth("");
      setHeight("");
      setSha256Hash("");
      
      const fileInput = document.getElementById("form-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Re-trigger path auto-populate for the empty filename
      const artist = artists.find((a) => a.id === artistId);
      const slug = artist?.slug || "artist";
      setStoragePath(`data/artists/${slug}/v1/raw/`);
    } else {
      setError(res.error || "An unexpected error occurred.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm text-slate-900 transition-all duration-200 overflow-hidden">
      {/* Clickable Header for Collapsible Accordion */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div>
            <h2 className="text-base font-bold text-slate-800">Advanced Manual Registration</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Manually register remote paths or upload local prototype files</p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Accordion Panel Content */}
      <div className={`transition-all duration-200 ${isOpen ? "block" : "hidden"}`}>
        <div className="border-t border-slate-100 p-5 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            {/* Status Messages */}
            {success && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3.5 text-emerald-800 flex items-start gap-2.5">
                <svg className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-xs">Registration Successful</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">The dataset image has been cataloged. Image counts updated.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-3.5 text-rose-800 flex items-start gap-2.5">
                <svg className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-xs">Registration Failed</p>
                  <p className="text-[11px] text-rose-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* 1. Artist Selection */}
            <div className="space-y-1">
              <label htmlFor="form-artist" className="block text-xs font-semibold text-slate-700">
                Artist <span className="text-rose-500">*</span>
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

            {/* 2. Dataset Version Selection */}
            <div className="space-y-1">
              <label htmlFor="form-version" className="block text-xs font-semibold text-slate-700">
                Dataset Version <span className="text-rose-500">*</span>
              </label>
              <select
                id="form-version"
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
              <label htmlFor="form-license" className="block text-xs font-semibold text-slate-700">
                License/Consent Record
              </label>
              <select
                id="form-license"
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

            {/* NEW: Optional Local File Upload */}
            <div className="space-y-1">
              <label htmlFor="form-file" className="block text-xs font-semibold text-slate-700">
                Upload Local Image File <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                id="form-file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    setImageFile(file);
                    const url = URL.createObjectURL(file);
                    setUploadPreview(url);
                    setError(null);
                  } else {
                    setImageFile(null);
                    setUploadPreview(null);
                  }
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                If uploaded, the filename and local directory path are automatically managed under <code>public/uploads/dataset-images</code>. Manual parameters below are bypassed.
              </p>
              {uploadPreview && (
                <div className="mt-2 relative w-24 h-24 rounded border border-slate-200 overflow-hidden bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadPreview}
                    alt="Staged image preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setUploadPreview(null);
                      const input = document.getElementById("form-file") as HTMLInputElement;
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

            {/* 4. Filename */}
            <div className="space-y-1">
              <label htmlFor="form-filename" className="block text-xs font-semibold text-slate-700">
                Filename {!imageFile && <span className="text-rose-500">*</span>}
              </label>
              <input
                id="form-filename"
                type="text"
                required={!imageFile}
                placeholder={imageFile ? "Auto-extracted from upload" : "e.g., hokusai_wave_01.jpg"}
                value={filename}
                onChange={(e) => handleFilenameChange(e.target.value)}
                disabled={isSubmitting || !!imageFile}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* 5. Storage Path */}
            <div className="space-y-1">
              <label htmlFor="form-storagepath" className="block text-xs font-semibold text-slate-700">
                Storage Path {!imageFile && <span className="text-rose-500">*</span>}
              </label>
              <input
                id="form-storagepath"
                type="text"
                required={!imageFile}
                placeholder={imageFile ? "Auto-generated on server" : "e.g., data/artists/.../raw/img.jpg"}
                value={storagePath}
                onChange={(e) => handleStoragePathChange(e.target.value)}
                disabled={isSubmitting || !!imageFile}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors disabled:opacity-50"
              />
              <p className="text-[10px] text-slate-400">
                Auto-generated based on filename and artist slug.
              </p>
            </div>

            {/* 6. Source URL */}
            <div className="space-y-1">
              <label htmlFor="form-sourceurl" className="block text-xs font-semibold text-slate-700">
                Source URL
              </label>
              <input
                id="form-sourceurl"
                type="url"
                placeholder="e.g., https://metmuseum.org/... (optional)"
                value={sourceUrl}
                onChange={(e) => {
                  setSourceUrl(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            {/* 7. Caption */}
            <div className="space-y-1">
              <label htmlFor="form-caption" className="block text-xs font-semibold text-slate-700">
                Caption
              </label>
              <textarea
                id="form-caption"
                rows={2}
                placeholder="e.g., A woodblock print of a great wave off Kanagawa... (optional)"
                value={caption}
                onChange={(e) => {
                  setCaption(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* 8. Dimensions & SHA256 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="form-width" className="block text-xs font-semibold text-slate-700">
                  Width (px)
                </label>
                <input
                  id="form-width"
                  type="number"
                  min="1"
                  placeholder={imageFile ? "Auto-computed" : "e.g., 1024"}
                  value={width}
                  onChange={(e) => {
                    setWidth(e.target.value);
                    setError(null);
                  }}
                  disabled={isSubmitting || !!imageFile}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="form-height" className="block text-xs font-semibold text-slate-700">
                  Height (px)
                </label>
                <input
                  id="form-height"
                  type="number"
                  min="1"
                  placeholder={imageFile ? "Auto-computed" : "e.g., 1024"}
                  value={height}
                  onChange={(e) => {
                    setHeight(e.target.value);
                    setError(null);
                  }}
                  disabled={isSubmitting || !!imageFile}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* 9. SHA256 Hash */}
            <div className="space-y-1">
              <label htmlFor="form-sha256" className="block text-xs font-semibold text-slate-700">
                SHA-256 Hash
              </label>
              <input
                id="form-sha256"
                type="text"
                placeholder={imageFile ? "Auto-computed" : "Hash to verify integrity (optional)"}
                value={sha256Hash}
                onChange={(e) => {
                  setSha256Hash(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting || !!imageFile}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* 10. Quality Status */}
            <div className="space-y-1">
              <label htmlFor="form-quality" className="block text-xs font-semibold text-slate-700">
                Quality Status
              </label>
              <select
                id="form-quality"
                value={qualityStatus}
                onChange={(e) => {
                  setQualityStatus(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved for Training</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Cataloging Record...
                </>
              ) : (
                "Register Dataset Image"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
