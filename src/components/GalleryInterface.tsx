"use client";

import React, { useState } from "react";

interface ArtistLite {
  id: string;
  displayName: string;
  slug: string;
}

interface ModelAdapterLite {
  id: string;
  adapterName: string;
  triggerToken: string | null;
}

interface DatasetVersionLite {
  id: string;
  versionName: string;
}

interface RoyaltyEventLite {
  id: string;
  amountCents: number;
  currency: string;
}

interface GenerationWithRelations {
  id: string;
  prompt: string;
  negativePrompt: string | null;
  seed: number | null;
  parametersJson: unknown;
  status: string;
  outputImagePath: string | null;
  errorMessage: string | null;
  createdAt: Date | string;
  completedAt: Date | string | null;
  artist: ArtistLite;
  modelAdapter: ModelAdapterLite | null;
  datasetVersion: DatasetVersionLite | null;
  royaltyEvent: RoyaltyEventLite | null;
}

interface GalleryInterfaceProps {
  initialGenerations: GenerationWithRelations[];
  artists: ArtistLite[];
}

export default function GalleryInterface({ initialGenerations, artists }: GalleryInterfaceProps) {
  // 1. Interactive Filters State
  const [selectedArtistId, setSelectedArtistId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // 2. Expandable details state (Modal)
  const [activeGen, setActiveGen] = useState<GenerationWithRelations | null>(null);

  // 3. Fallback tracking state for images that fail to load
  const [brokenImages, setBrokenBrokenImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setBrokenBrokenImages((prev) => ({ ...prev, [id]: true }));
  };

  // 4. Perform dynamic, reactive filtering on client loaded data
  const filteredGenerations = initialGenerations.filter((gen) => {
    const matchesArtist = selectedArtistId === "all" || gen.artist.id === selectedArtistId;
    
    let matchesStatus = true;
    if (selectedStatus === "completed") {
      matchesStatus = gen.status === "completed" && gen.outputImagePath !== null;
    } else if (selectedStatus === "queued") {
      matchesStatus = gen.status === "queued";
    } else if (selectedStatus === "failed") {
      matchesStatus = gen.status === "failed";
    }

    return matchesArtist && matchesStatus;
  });

  return (
    <div className="space-y-6 text-slate-900">
      
      {/* 1. Boss-Demo Explanation Panel */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none select-none">
          <svg className="h-32 w-32 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-indigo-800">
            Boss-Demo attribution dashboard
          </div>
          <h2 className="text-lg font-black text-indigo-900 tracking-tight">Platform Style-Attribution Matrix</h2>
          <p className="text-xs text-indigo-800 leading-relaxed font-medium">
            This gallery demonstrates per-style attribution. Every output is connected to the selected artist adapter and can trigger a simulated royalty event. Feel free to inspect weights provenance, training dataset sources, and random-seed metadata parameters.
          </p>
        </div>
      </div>

      {/* 2. Responsive Filtering Row */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          
          {/* Artist selector */}
          <div className="space-y-1">
            <label htmlFor="filter-artist" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Filter by Artist Style
            </label>
            <select
              id="filter-artist"
              value={selectedArtistId}
              onChange={(e) => setSelectedArtistId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all w-full sm:w-48"
            >
              <option value="all">All Creator Styles</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Status selector */}
          <div className="space-y-1">
            <label htmlFor="filter-status" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Inference Status
            </label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all w-full sm:w-48"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed Renders</option>
              <option value="queued">Queued in Pipeline</option>
              <option value="failed">Failed / Aborted</option>
            </select>
          </div>

        </div>

        {/* Counter of shown items */}
        <span className="font-mono text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded">
          SHOWN: {filteredGenerations.length} of {initialGenerations.length}
        </span>
      </div>

      {/* 3. responsive Grid Canvas */}
      {filteredGenerations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGenerations.map((gen) => {
            const formattedDate = new Date(gen.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            const isBroken = brokenImages[gen.id] || !gen.outputImagePath;

            return (
              <div
                key={gen.id}
                onClick={() => setActiveGen(gen)}
                className="group rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer hover:-translate-y-0.5"
              >
                {/* Visual rendering panel */}
                <div className="relative aspect-square w-full bg-slate-950 border-b border-slate-100 overflow-hidden flex items-center justify-center">
                  {isBroken ? (
                    /* Fallback neural placeholder block */
                    <div className="h-full w-full bg-slate-900 border border-slate-800 p-6 flex flex-col justify-center items-center text-center space-y-3">
                      {brokenImages[gen.id] || (gen.status === "completed" && !gen.outputImagePath) ? (
                        <div className="text-rose-500">
                          <p className="text-xs font-bold uppercase tracking-widest">
                            ⚠️ Image preview unavailable.
                          </p>
                          <p className="text-[10px] text-rose-400 max-w-xs mt-1 font-mono break-all leading-normal">
                            Stored path: <span className="font-bold underline">{gen.outputImagePath || "None"}</span>
                          </p>
                        </div>
                      ) : (
                        <>
                          <svg className="h-10 w-10 text-indigo-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          </svg>
                          <div>
                            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                              {gen.status === "failed" ? "Render Blocked" : "Preview Wireframe"}
                            </p>
                            <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                              {gen.status === "failed" ? gen.errorMessage || "GPU Node exception." : "Image render fallback asset."}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={gen.outputImagePath!}
                      alt="Art style render preview"
                      onError={() => handleImageError(gen.id)}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Gradient bottom prompt preview */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-left">
                    <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">PROMPT CONTEXT</p>
                    <p className="text-xs text-white line-clamp-2 leading-relaxed mt-0.5 select-none font-medium">{gen.prompt}</p>
                  </div>
                </div>

                {/* Content details and attributions */}
                <div className="p-5 space-y-4 text-left">
                  {/* Status & Date */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                    <span>{formattedDate}</span>
                    <span className={`uppercase font-mono tracking-wider px-1.5 py-0.5 rounded text-[9px] ${
                      gen.status === "completed"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                        : gen.status === "failed"
                        ? "bg-rose-50 text-rose-800 border border-rose-100 animate-pulse"
                        : "bg-amber-50 text-amber-800 border border-amber-100 animate-pulse"
                    }`}>
                      {gen.status}
                    </span>
                  </div>

                  {/* Prompt Text */}
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed h-8" title={gen.prompt}>
                    &ldquo;{gen.prompt}&rdquo;
                  </p>

                  {/* Core Attribution matrices */}
                  <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10px] text-slate-400 uppercase">Creator:</span>
                      <span className="font-bold text-slate-800">{gen.artist.displayName}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10px] text-slate-400 uppercase">Adapter:</span>
                      <span className="font-semibold text-indigo-600">{gen.modelAdapter?.adapterName || "—"}</span>
                    </div>

                    {gen.datasetVersion && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[10px] text-slate-400 uppercase">Dataset:</span>
                        <span className="font-mono text-[11px] text-slate-700">{gen.datasetVersion.versionName}</span>
                      </div>
                    )}
                  </div>

                  {/* attribution and Royalty logs */}
                  <div className="border-t border-slate-100 pt-3.5 flex flex-col gap-1.5">
                    <p className="text-[10px] font-semibold text-slate-400">
                      Attributed to: <span className="text-slate-700 font-bold">{gen.artist.displayName}</span> via <span className="text-indigo-600 font-bold">{gen.modelAdapter?.adapterName || "N/A"}</span>
                    </p>

                    {gen.royaltyEvent ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[11px] text-emerald-800 font-bold w-fit">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Simulated royalty logged: ¥{gen.royaltyEvent.amountCents} {gen.royaltyEvent.currency}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1 text-[11px] text-slate-400 italic w-fit">
                        No royalties computed (non-completed render)
                      </div>
                    )}
                  </div>
                </div>

                {/* Card hover action tag */}
                <div className="bg-slate-50 border-t border-slate-100 px-5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50/30 transition-colors select-none">
                  Inspect style details &rarr;
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm text-center max-w-xl mx-auto space-y-5">
          <div className="h-16 w-16 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-sm">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-800">No generated images yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              We couldn&apos;t find any renders matching the selected filter criteria. Create your first generation using hot-swappable style adapters on the Generate page.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/generate"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow hover:bg-indigo-700 focus:outline-none transition-all cursor-pointer"
            >
              Generate style image
            </a>
          </div>
        </div>
      )}

      {/* 4. Click-to-Expand Details Modal Drawer */}
      {activeGen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full text-slate-100 flex flex-col overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="border-b border-slate-800 p-5 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400">Attribution Provenance Manifest</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Hash tracking & model adapter hyperparameter index.</p>
              </div>
              <button
                onClick={() => setActiveGen(null)}
                className="h-8 w-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center focus:outline-none transition-all font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              
              {/* Output Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-1 rounded-lg border border-slate-800 aspect-square overflow-hidden bg-slate-950 relative flex items-center justify-center">
                  {brokenImages[activeGen.id] || !activeGen.outputImagePath ? (
                    <div className="text-rose-500 text-center p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest">
                        ⚠️ Image preview unavailable.
                      </p>
                      <p className="text-[9px] text-rose-400 mt-1 font-mono break-all leading-tight">
                        Stored path: <span className="font-bold underline">{activeGen.outputImagePath || "None"}</span>
                      </p>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={activeGen.outputImagePath!}
                      alt="Active inspect view"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="md:col-span-2 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generation Prompt</h4>
                  <p className="text-sm font-semibold leading-relaxed text-slate-100 italic bg-slate-950 p-3 rounded border border-slate-800">
                    &ldquo;{activeGen.prompt}&rdquo;
                  </p>
                  {activeGen.negativePrompt && (
                    <p className="text-xs text-slate-500 leading-normal">
                      <span className="font-bold text-slate-400 uppercase mr-1">Negative prompt:</span>
                      {activeGen.negativePrompt}
                    </p>
                  )}
                </div>
              </div>

              {/* Strict Relational Trace ID Block */}
              <div className="space-y-3 border-t border-slate-800/60 pt-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Metadata Identifiers</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Generation ID */}
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-3 text-left">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Generation Request ID</span>
                    <span className="font-mono text-xs text-slate-300 select-all block mt-0.5">{activeGen.id}</span>
                  </div>

                  {/* Artist ID */}
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-3 text-left">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Artist Entity ID (displayName: {activeGen.artist.displayName})</span>
                    <span className="font-mono text-xs text-slate-300 select-all block mt-0.5">{activeGen.artist.id}</span>
                  </div>

                  {/* Adapter ID */}
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-3 text-left">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Adapter Entity ID (name: {activeGen.modelAdapter?.adapterName || "N/A"})</span>
                    <span className="font-mono text-xs text-indigo-300 select-all block mt-0.5">{activeGen.modelAdapter?.id || "N/A"}</span>
                  </div>

                  {/* Dataset Version ID */}
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-3 text-left">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Dataset Version ID (name: {activeGen.datasetVersion?.versionName || "N/A"})</span>
                    <span className="font-mono text-xs text-slate-300 select-all block mt-0.5">{activeGen.datasetVersion?.id || "N/A"}</span>
                  </div>

                  {/* Royalty Event ID */}
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-3 text-left md:col-span-2">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Simulated Royalty Event ID</span>
                    <span className="font-mono text-xs text-emerald-400 select-all block mt-0.5">
                      {activeGen.royaltyEvent ? `${activeGen.royaltyEvent.id} (¥${activeGen.royaltyEvent.amountCents} ${activeGen.royaltyEvent.currency})` : "No Royalty Record (Non-Completed render or Failed)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Advanced Parameters details */}
              <div className="space-y-3 border-t border-slate-800/60 pt-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inference Hyperparameters</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="rounded-lg bg-slate-950 p-3">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Seed</span>
                    <span className="text-slate-200 mt-1 block font-black">{activeGen.seed !== null ? activeGen.seed : "Randomized"}</span>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-3">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Render Steps</span>
                    <span className="text-slate-200 mt-1 block font-black">
                      {(activeGen.parametersJson as { steps?: string | number })?.steps || "30"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-3">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">CFG Scale</span>
                    <span className="text-slate-200 mt-1 block font-black">
                      {(activeGen.parametersJson as { guidanceScale?: string | number })?.guidanceScale || "7.5"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="pt-2 border-t border-slate-800/40 text-[10px] text-slate-500 flex justify-between items-center font-mono">
                <span>CREATED: {new Date(activeGen.createdAt).toLocaleString()}</span>
                <span>COMPLETED: {activeGen.completedAt ? new Date(activeGen.completedAt).toLocaleString() : "—"}</span>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 bg-slate-950 p-4.5 text-right">
              <button
                onClick={() => setActiveGen(null)}
                className="rounded-lg bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Close inspect
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
