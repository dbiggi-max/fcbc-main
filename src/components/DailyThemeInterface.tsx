"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession, signIn } from "next-auth/react";
import { submitThemeSubmission } from "@/app/daily-theme/actions";

// Dynamic import for Tldraw with SSR disabled to prevent server-side canvas exception errors
const TldrawCanvas = dynamic(
  () => import("tldraw").then((mod) => mod.Tldraw),
  { ssr: false }
);

// Import Tldraw's necessary CSS styling
import "tldraw/tldraw.css";

interface ArtistLite {
  id: string;
  displayName: string;
  slug: string;
}

interface ThemeSubmissionLite {
  id: string;
  imagePath: string;
  promptOrCaption: string | null;
  userId: string | null;
  validationStatus: string;
  savedToDataset: boolean;
  clipSimilarityScore: number | null;
  validationExplanation: string | null;
  createdAt: Date | string;
  artist: ArtistLite | null;
}

interface DailyThemeLite {
  id: string;
  themeText: string;
  description: string | null;
  themeDate: Date | string;
}

interface DailyThemeInterfaceProps {
  activeTheme: DailyThemeLite;
  initialSubmissions: ThemeSubmissionLite[];
  artists: ArtistLite[];
}

export default function DailyThemeInterface({
  activeTheme,
  initialSubmissions,
  artists,
}: DailyThemeInterfaceProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Ingestion Mode State (Browser Professional Paint versus Local Drag-and-Drop)
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");

  // Form Metadata States
  const [imagePath, setImagePath] = useState("");
  const [caption, setCaption] = useState("");
  const [userId, setUserId] = useState("");
  const [selectedArtistId, setSelectedArtistId] = useState("none");

  // Local File Upload & Preview States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showUrlFallback, setShowUrlField] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client mounting safety check
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync userId state from authenticated session
  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
    } else {
      setUserId("");
    }
  }, [session]);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!isMounted) return;
    
    const savedCaption = localStorage.getItem("fcbc_draft_caption");
    if (savedCaption) setCaption(savedCaption);

    const savedTab = localStorage.getItem("fcbc_draft_tab");
    if (savedTab === "draw" || savedTab === "upload") {
      setActiveTab(savedTab as any);
    }
  }, [isMounted]);

  // Sync caption and activeTab to localStorage on changes
  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem("fcbc_draft_caption", caption);
    localStorage.setItem("fcbc_draft_tab", activeTab);
  }, [caption, activeTab, isMounted]);

  // Tldraw programmatical editor reference instance
  const [tldrawEditor, setTldrawEditor] = useState<any | null>(null);

  // Load and subscribe to Tldraw canvas draft changes
  useEffect(() => {
    if (!tldrawEditor || !isMounted) return;

    let isCancelled = false;
    let cleanup: (() => void) | undefined;

    // Dynamically import tldraw utilities to avoid server-side canvas exceptions
    import("tldraw").then(({ getSnapshot, loadSnapshot }) => {
      if (isCancelled) return;

      // Restore canvas shapes
      const savedCanvas = localStorage.getItem("fcbc_tldraw_draft");
      if (savedCanvas) {
        try {
          const snapshot = JSON.parse(savedCanvas);
          loadSnapshot(tldrawEditor.store, snapshot);
        } catch (err) {
          console.error("Failed to restore Tldraw draft snapshot:", err);
        }
      }

      // Auto-save on canvas changes
      cleanup = tldrawEditor.store.listen(() => {
        try {
          const snapshot = getSnapshot(tldrawEditor.store);
          localStorage.setItem("fcbc_tldraw_draft", JSON.stringify(snapshot));
        } catch (err) {
          console.error("Failed to save Tldraw draft snapshot:", err);
        }
      });
    });

    return () => {
      isCancelled = true;
      if (cleanup) cleanup();
    };
  }, [tldrawEditor, isMounted]);

  // UX & Async Ingestion States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Track image load errors for submissions
  const [brokenPreviews, setBrokenPreviews] = useState<Record<string, boolean>>({});

  const handlePreviewError = (id: string) => {
    setBrokenPreviews((prev) => ({ ...prev, [id]: true }));
  };

  // Convert uploaded drawing (Krita / Procreate exports) to client-side Base64 preview
  const processUploadFile = (file: File) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      setFormError("Only JPEG, PNG, and WebP drawing files are supported.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormError("File size exceeds 10 MB limit.");
      return;
    }

    setSelectedFile(file); // Track raw file object for Form Data uploads

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setUploadPreview(base64);
      setImagePath(base64); // Render base64 image preview locally
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setFormError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    if (e.target.files && e.target.files.length > 0) {
      processUploadFile(e.target.files[0]);
    }
  };

  const removeUploadedFile = () => {
    setSelectedFile(null);
    setUploadPreview(null);
    setImagePath("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle Tldraw editor mounting
  const handleTldrawMount = (editor: any) => {
    setTldrawEditor(editor);
  };

  // Submit Ingestion Payload
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setSuccessMsg(null);

    // Conditional Google OAuth login trigger with draft preservation
    if (status !== "authenticated") {
      setFormError("Authentication is required to submit. Preserving your artwork and redirecting to Google Login...");
      
      localStorage.setItem("fcbc_draft_caption", caption);
      localStorage.setItem("fcbc_draft_tab", activeTab);
      if (activeTab === "draw" && tldrawEditor) {
        try {
          const { getSnapshot } = await import("tldraw");
          const snapshot = getSnapshot(tldrawEditor.store);
          localStorage.setItem("fcbc_tldraw_draft", JSON.stringify(snapshot));
        } catch (err) {
          console.error("Draft save failed on auth redirect:", err);
        }
      }

      setTimeout(() => {
        signIn("google", { callbackUrl: window.location.href });
      }, 1500);
      return;
    }

    const formData = new FormData();
    formData.append("dailyThemeId", activeTheme.id);
    formData.append("promptOrCaption", caption.trim());
    formData.append("userId", userId.trim());
    formData.append("artistId", selectedArtistId);

    // Export raw drawing data if browser draw tab is active
    if (activeTab === "draw") {
      if (!tldrawEditor) {
        setFormError("The professional drawing studio is not fully loaded yet.");
        setIsSubmitting(false);
        return;
      }
      try {
        const shapeIds = tldrawEditor.getCurrentPageShapeIds();
        if (shapeIds.size === 0) {
          setFormError("Please sketch an illustration on the professional canvas before submitting.");
          setIsSubmitting(false);
          return;
        }

        // Export vector shapes to image result
        const result = await tldrawEditor.toImage([...shapeIds], {
          format: "png",
          pixelRatio: 2,
          background: true,
        });

        if (!result || !result.blob) {
          setFormError("Failed to convert your painting to PNG format.");
          setIsSubmitting(false);
          return;
        }

        // Pack the Tldraw drawing as a File!
        const file = new File([result.blob], `tldraw_painting_${Date.now()}.png`, { type: "image/png" });
        formData.append("imageFile", file);

      } catch (err) {
        console.error("Tldraw export failed:", err);
        setFormError("Failed to export your painting from the professional canvas.");
        setIsSubmitting(false);
        return;
      }
    } else {
      // activeTab === "upload"
      if (selectedFile) {
        formData.append("imageFile", selectedFile);
      } else if (imagePath.trim() !== "") {
        formData.append("imagePath", imagePath.trim());
      } else {
        setFormError("Please select or drag-and-drop a drawing file to submit.");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const result = await submitThemeSubmission(formData);

      if (result.success) {
        setSuccessMsg("Incredible! Your artwork has been successfully ingested and checked against daily theme boundaries.");
        
        // Clear metadata
        setCaption("");
        setImagePath("");
        setUserId("");
        setSelectedArtistId("none");
        setUploadPreview(null);
        setSelectedFile(null);
        
        // Reset Tldraw canvas
        if (activeTab === "draw" && tldrawEditor) {
          tldrawEditor.selectAll();
          tldrawEditor.deleteShapes(tldrawEditor.getSelectedShapeIds());
        }

        router.refresh();
      } else {
        setFormError(result.error || "Submission encountered an error.");
      }
    } catch (err) {
      console.error("Submit exception:", err);
      setFormError("An unexpected system exception occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 text-slate-900">
      
      {/* 1. System Explanation Banner */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-6 shadow-sm relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none select-none">
          <svg className="h-32 w-32 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-indigo-800">
            Professional Editor
          </div>
          <h2 className="text-lg font-black text-indigo-900 tracking-tight">Professional Tldraw Studio</h2>
          <p className="text-xs text-indigo-800 leading-relaxed font-medium">
            We have replaced the basic sketchpad with <strong>Tldraw</strong>, the industry-standard professional drawing studio. Enjoy vector-smoothed brush strokes, shapes, lasso selection, zoom/panning controls, grids, and perfect multi-device stylus pressure.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left/Middle: Interactive Upload Board & Form (Wider 2/3 column) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Theme Challenge Banner */}
          <div className="rounded-xl border border-slate-200 bg-slate-950 p-6 shadow-sm text-white text-left relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                <span>TODAY&apos;S ACTIVE CHALLENGE</span>
                <span className="bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded text-[9px] text-indigo-300 animate-pulse">
                  ACTIVE
                </span>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-xl font-black tracking-tight leading-tight text-white">
                  &ldquo;{activeTheme.themeText}&rdquo;
                </h3>
                {activeTheme.description && (
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    {activeTheme.description}
                  </p>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span>CALENDAR DATE:</span>
                <span>{new Date(activeTheme.themeDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Core Submission Interface Form Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-left space-y-6">
            
            {/* Action Tabs for drawing versus file uploading */}
            <div className="flex border-b border-slate-100 pb-1 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("draw");
                  setFormError(null);
                }}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === "draw"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                🎨 Professional Canvas (Tldraw)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("upload");
                  setFormError(null);
                }}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === "upload"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                📤 Upload Krita/Procreate File
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Tab 1: Professional Tldraw Canvas */}
              {activeTab === "draw" && (
                <div className="space-y-4">
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 shadow-md bg-slate-50 flex items-center justify-center p-0.5">
                    {isMounted ? (
                      <TldrawCanvas
                        onMount={handleTldrawMount}
                        autoFocus={false}
                      />
                    ) : (
                      <div className="text-xs text-slate-400 font-mono animate-pulse">
                        Booting professional Tldraw studio...
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center font-medium">
                    Use full lasso selecting, shapes, custom pens, eraser, and scroll to zoom inside the workspace.
                  </p>
                </div>
              )}

              {/* Tab 2: Professional Drag & Drop Upload Panel */}
              {activeTab === "upload" && (
                <div className="space-y-4">
                  <span className="block text-xs font-bold text-slate-500 uppercase">
                    Select drawing file <span className="text-red-500">*</span>
                  </span>

                  {uploadPreview ? (
                    /* Live Preview deck if file is loaded successfully */
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-3 relative">
                      <div className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-white relative flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={uploadPreview}
                          alt="Loaded drawing preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ File Loaded Successfully
                        </span>
                        <button
                          type="button"
                          onClick={removeUploadedFile}
                          className="text-[10px] font-black uppercase tracking-wider text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove & Re-upload
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Standard drag active file dropping area */
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
                        isDragActive
                          ? "border-indigo-500 bg-indigo-50/50"
                          : "border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-slate-50/50 animate-pulse"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                        className="hidden"
                      />
                      <div className="space-y-2">
                        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <div className="text-xs text-slate-500 font-medium">
                          <span className="font-black text-indigo-600">Drag your Krita/Procreate drawing here</span> or browse files
                        </div>
                        <p className="text-[10px] text-slate-400">Supports PNG, JPEG, and WebP drawing files (Max 10 MB)</p>
                      </div>
                    </div>
                  )}

                  {/* Optional Toggle for typing custom server asset strings manually */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowUrlField(!showUrlFallback)}
                      className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {showUrlFallback ? "Hide advanced URL field" : "Or manual image path/URL instead..."}
                    </button>

                    {showUrlFallback && (
                      <div className="space-y-1 mt-3">
                        <label htmlFor="input-image" className="block text-xs font-bold text-slate-500">
                          Image URL or Path
                        </label>
                        <input
                          id="input-image"
                          type="text"
                          placeholder="/public/uploads/datasets/... or https://"
                          value={imagePath.startsWith("data:") ? "" : imagePath}
                          onChange={(e) => setImagePath(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Ingestion caption */}
              <div className="space-y-1">
                <label htmlFor="input-caption" className="block text-xs font-bold text-slate-500">
                  Drawing Caption / Prompt <span className="text-slate-400">(Recommended)</span>
                </label>
                <textarea
                  id="input-caption"
                  rows={3}
                  placeholder="e.g. A gorgeous woodblock landscape of Mount Fuji during sunset, deep reds and oranges..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              {/* Common Metadata Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Submitter User ID */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">
                    Submitter Identity
                  </label>
                  {status === "authenticated" ? (
                    <div className="flex items-center gap-2 w-full rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="truncate font-semibold">
                        Logged in as <strong className="font-black text-emerald-950">{session?.user?.name || session?.user?.email}</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-xs text-amber-800">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <span className="truncate font-medium">
                        Google login triggered on submit
                      </span>
                    </div>
                  )}
                </div>

                {/* Linking profile dropdown */}
                <div className="space-y-1">
                  <label htmlFor="input-artist" className="block text-xs font-bold text-slate-500">
                    Link to Style Profile <span className="text-slate-400">(Optional)</span>
                  </label>
                  <select
                    id="input-artist"
                    value={selectedArtistId}
                    onChange={(e) => setSelectedArtistId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="none">No style link (General user)</option>
                    {artists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Warnings and alerts notifications */}
              {formError && (
                <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-800 font-medium">
                  ⚠️ {formError}
                </div>
              )}

              {successMsg && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800 font-medium">
                  🎉 {successMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-indigo-700 hover:shadow-md focus:outline-none transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Registering Ingestion..." : "🚀 Submit Candidate Ingestion"}
              </button>

            </form>
          </div>

        </div>

        {/* Right Side Sidebar Feed: Today's Active Ingestions (Narrower 1/3 column) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-left space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                Active Ingestions Feed
              </h3>
              <span className="font-mono text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                COLLECTED: {initialSubmissions.length}
              </span>
            </div>

            {/* Ingestion cards list feed */}
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {initialSubmissions.length > 0 ? (
                initialSubmissions.map((sub) => {
                  const createdDateStr = new Date(sub.createdAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });

                  const isBroken = brokenPreviews[sub.id] || !sub.imagePath;

                  return (
                    <div
                      key={sub.id}
                      className="flex gap-3 items-center p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm transition-all"
                    >
                      {/* Drawing thumbnail preview with precise broken preview fallback */}
                      <div className="h-12 w-12 rounded overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 relative">
                        {isBroken ? (
                          <div
                            className="text-[8px] text-rose-500 font-mono leading-tight bg-rose-50 p-1 text-center font-bold"
                            title={`Image preview unavailable. Stored path: ${sub.imagePath}`}
                          >
                            ⚠️ Preview Error
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={sub.imagePath}
                            alt="Drawing preview"
                            onError={() => handlePreviewError(sub.id)}
                            className="h-full w-full object-cover bg-white"
                          />
                        )}
                      </div>

                      {/* Info and artist style tags */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {sub.promptOrCaption || <span className="text-slate-400 font-normal italic">No caption provided</span>}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-medium">
                          <span>{createdDateStr}</span>
                          <span>•</span>
                          <span className="truncate">
                            {sub.artist ? (
                              <span className="text-indigo-600 font-semibold">{sub.artist.displayName}</span>
                            ) : (
                              "General Submitter"
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="shrink-0 text-right space-y-1">
                        <div>
                          {sub.validationStatus === "accepted" ? (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[9px] uppercase tracking-wider font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-xs">
                              Accepted
                            </span>
                          ) : sub.validationStatus === "needs_review" ? (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[9px] uppercase tracking-wider font-mono font-bold bg-amber-50 text-amber-800 border border-amber-100 shadow-xs">
                              Needs Review
                            </span>
                          ) : sub.validationStatus === "rejected" ? (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[9px] uppercase tracking-wider font-mono font-bold bg-rose-50 text-rose-800 border border-rose-100 shadow-xs">
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[9px] uppercase tracking-wider font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Pending
                            </span>
                          )}
                        </div>
                        {sub.savedToDataset && (
                          <div>
                            <span className="inline-flex items-center rounded-md px-1.5 py-0.25 text-[8px] font-bold uppercase font-mono bg-purple-50 text-purple-700 border border-purple-100 shadow-xs">
                              Enrolled
                            </span>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-12">
                  No submissions have been ingested today. Submit yours first!
                </p>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
