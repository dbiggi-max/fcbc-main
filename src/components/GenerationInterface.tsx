"use client";

import React, { useState } from "react";
import { generateStyleImage } from "@/app/generate/actions";

interface ModelAdapterLite {
  id: string;
  adapterName: string;
  status: string;
  triggerToken: string | null;
  baseModel: string;
  datasetVersion: {
    id: string;
    versionName: string;
  } | null;
}

interface ArtistWithAdapters {
  id: string;
  displayName: string;
  slug: string;
  modelAdapters: ModelAdapterLite[];
}

interface GenerationInterfaceProps {
  artists: ArtistWithAdapters[];
}

export default function GenerationInterface({ artists }: GenerationInterfaceProps) {
  // 1. Selection State (Synchronous Mount Initialization)
  const [artistId, setArtistId] = useState(() => artists[0]?.id || "");
  const [adapterId, setAdapterId] = useState(() => {
    const firstArtist = artists[0];
    return firstArtist?.modelAdapters[0]?.id || "";
  });

  // 2. Generation Form Parameters
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [seed, setSeed] = useState("");
  const [steps, setSteps] = useState("30");
  const [guidanceScale, setGuidanceScale] = useState("7.5");

  // 3. Flow control states
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Holds the completed generation success object
  const [result, setResult] = useState<{
    generation: {
      id: string;
      prompt: string;
      outputImagePath: string;
      seed: number;
      createdAt: string;
      artist: { displayName: string };
      modelAdapter: { adapterName: string; baseModel: string; triggerToken: string | null };
      datasetVersion: { versionName: string } | null;
    };
    royalty: {
      amountCents: number;
      currency: string;
    };
  } | null>(null);

  // 4. Extract active options
  const activeArtist = artists.find((a) => a.id === artistId);
  const activeAdapters = activeArtist?.modelAdapters || [];

  // Update selected adapter when artist changes
  const handleArtistChange = (newArtistId: string) => {
    setArtistId(newArtistId);
    setError(null);
    setResult(null);

    const targetArtist = artists.find((a) => a.id === newArtistId);
    if (targetArtist && targetArtist.modelAdapters.length > 0) {
      setAdapterId(targetArtist.modelAdapters[0].id);
      
      // Smart Auto-suggest prompts if prompt is empty
      if (!prompt.trim()) {
        const slug = targetArtist.slug;
        setPrompt(`A beautiful scenic mountain landscape with cherry blossoms blowing in the wind, style of ${slug}, masterpiece`);
      }
    } else {
      setAdapterId("");
    }
  };

  // 5. Submit generation logic
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setResult(null);

    // Front-end validation
    if (!artistId) {
      setError("Please select an artist style.");
      setIsGenerating(false);
      return;
    }
    if (!adapterId) {
      setError("Please select a model adapter.");
      setIsGenerating(false);
      return;
    }
    if (!prompt.trim()) {
      setError("Generation prompt is required.");
      setIsGenerating(false);
      return;
    }
    if (prompt.trim().length < 3) {
      setError("Prompt must be at least 3 characters long.");
      setIsGenerating(false);
      return;
    }

    const numericSteps = parseInt(steps, 10);
    if (isNaN(numericSteps) || numericSteps < 1 || numericSteps > 100) {
      setError("Steps must be a whole number between 1 and 100.");
      setIsGenerating(false);
      return;
    }

    const numericScale = parseFloat(guidanceScale);
    if (isNaN(numericScale) || numericScale < 1 || numericScale > 20) {
      setError("Guidance scale must be a number between 1.0 and 20.0.");
      setIsGenerating(false);
      return;
    }

    const parsedSeed = seed.trim() !== "" ? parseInt(seed, 10) : null;
    if (seed.trim() !== "" && (parsedSeed === null || isNaN(parsedSeed))) {
      setError("If seed is provided, it must be a valid integer.");
      setIsGenerating(false);
      return;
    }

    // Call server action
    const res = await generateStyleImage({
      artistId,
      modelAdapterId: adapterId,
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim() || null,
      seed: parsedSeed,
      steps: numericSteps,
      guidanceScale: numericScale,
    });

    if (res.success && res.generation && res.royalty) {
      // Cast the successfully completed result details into state
      setResult({
        generation: res.generation as unknown as {
          id: string;
          prompt: string;
          outputImagePath: string;
          seed: number;
          createdAt: string;
          artist: { displayName: string };
          modelAdapter: { adapterName: string; baseModel: string; triggerToken: string | null };
          datasetVersion: { versionName: string } | null;
        },
        royalty: res.royalty,
      });
    } else {
      setError(res.error || "Inference execution failed.");
    }
    setIsGenerating(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* ================= LEFT SIDE: Param Controls (2 columns) ================= */}
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Style Parameters
            </h2>
            <p className="text-xs text-slate-400">Configure parameters to hot-swap style adapters during inference.</p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Error alerts */}
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-4 text-rose-800 flex items-start gap-3">
                <svg className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs">
                  <p className="font-bold">Generation Blocked</p>
                  <p className="mt-0.5 text-rose-600 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* 1. Artist Style Selector */}
            <div className="space-y-1">
              <label htmlFor="gen-artist" className="block text-xs font-semibold text-slate-700">
                Artist Style <span className="text-rose-500">*</span>
              </label>
              <select
                id="gen-artist"
                value={artistId}
                onChange={(e) => handleArtistChange(e.target.value)}
                disabled={isGenerating}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
              >
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Model Adapter Selector */}
            <div className="space-y-1">
              <label htmlFor="gen-adapter" className="block text-xs font-semibold text-slate-700">
                Hot-Swappable Adapter <span className="text-rose-500">*</span>
              </label>
              <select
                id="gen-adapter"
                value={adapterId}
                onChange={(e) => {
                  setAdapterId(e.target.value);
                  setError(null);
                }}
                disabled={isGenerating || activeAdapters.length === 0}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
              >
                {activeAdapters.length === 0 ? (
                  <option value="">No Adapters Available</option>
                ) : (
                  activeAdapters.map((ad) => {
                    const statusText = ad.status.replace(/_/g, " ");
                    return (
                      <option key={ad.id} value={ad.id}>
                        {ad.adapterName} ({statusText})
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* 3. Prompt Textarea */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="gen-prompt" className="block text-xs font-semibold text-slate-700">
                  Style Prompt <span className="text-rose-500">*</span>
                </label>
                {activeArtist && (
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    Trigger: style of {activeArtist.slug}
                  </span>
                )}
              </div>
              <textarea
                id="gen-prompt"
                rows={3}
                required
                placeholder="e.g. A gorgeous woodblock print depicting Mt. Fuji peaking behind misty waves..."
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setError(null);
                  setResult(null);
                }}
                disabled={isGenerating}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all leading-relaxed resize-none"
              />
            </div>

            {/* 4. Negative Prompt (Optional) */}
            <div className="space-y-1">
              <label htmlFor="gen-negative-prompt" className="block text-xs font-semibold text-slate-700">
                Negative Prompt <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="gen-negative-prompt"
                rows={2}
                placeholder="e.g. photorealistic, digital painting, noise, text, watermark, signature"
                value={negativePrompt}
                onChange={(e) => {
                  setNegativePrompt(e.target.value);
                  setError(null);
                }}
                disabled={isGenerating}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all leading-relaxed resize-none"
              />
            </div>

            {/* Advanced Tuning Panel */}
            <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Inference Tuning</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Steps */}
                <div className="space-y-1">
                  <label htmlFor="gen-steps" className="block text-[10px] font-bold text-slate-600">
                    Steps (Speed vs Quality)
                  </label>
                  <input
                    id="gen-steps"
                    type="number"
                    min={1}
                    max={100}
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    disabled={isGenerating}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Guidance Scale */}
                <div className="space-y-1">
                  <label htmlFor="gen-scale" className="block text-[10px] font-bold text-slate-600">
                    CFG Scale (Prompt Weight)
                  </label>
                  <input
                    id="gen-scale"
                    type="number"
                    step={0.5}
                    min={1}
                    max={20}
                    value={guidanceScale}
                    onChange={(e) => setGuidanceScale(e.target.value)}
                    disabled={isGenerating}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Seed */}
              <div className="space-y-1">
                <label htmlFor="gen-seed" className="block text-[10px] font-bold text-slate-600">
                  Seed (Reproducibility) <span className="text-slate-400 font-normal">(Leave blank for random)</span>
                </label>
                <input
                  id="gen-seed"
                  type="text"
                  placeholder="e.g. 42"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  disabled={isGenerating}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={isGenerating || activeAdapters.length === 0}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing style adapter...
                </>
              ) : (
                "Generate Style Image"
              )}
            </button>
          </form>
        </div>

        {/* Prototype Advisor Reminder Box */}
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-5 text-amber-900 shadow-inner">
          <div className="flex gap-3">
            <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs leading-relaxed space-y-1">
              <p className="font-bold">Prototype Limitations Box</p>
              <p className="text-amber-800">
                This step uses **mock inference**. Real GPU model execution and LoRA loading will be integrated after compiling weights externally in Colab or Kaggle.
              </p>
              <p className="text-amber-700 text-[10px] mt-2 leading-normal">
                However, this setup fully tests database logging, dynamic attribution, and simulated royalty event generation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDE: Canvas Visual Output (3 columns) ================= */}
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-6 shadow-xl flex flex-col justify-between h-full min-h-[550px] relative overflow-hidden">
          
          {/* Subtle glowing circuit grid decoration in background */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40"></div>

          {/* Core canvas content switcher */}
          {isGenerating ? (
            /* CASE 1: Processing Animation State */
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-pulse relative z-10 py-12">
              <div className="relative">
                {/* Multi-layered spinning rings */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-500/20 animate-spin [animation-duration:10s]"></div>
                <div className="absolute -inset-2 rounded-full border border-dashed border-cyan-500/30 animate-spin [animation-duration:4s] [animation-direction:reverse]"></div>
                <div className="h-16 w-16 rounded-full bg-slate-800 border border-indigo-400 flex items-center justify-center shadow-lg">
                  <svg className="animate-spin h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-widest text-cyan-400">Processing Style Adapter</p>
                <p className="text-xs text-slate-400 max-w-sm px-4 leading-relaxed">
                  Interfacing with model adapter config, simulating GPU warm-ups, and compiling weights matrix...
                </p>
              </div>
            </div>
          ) : result ? (
            /* CASE 2: Output Display Result Panel */
            <div className="flex-1 flex flex-col space-y-6 relative z-10">
              
              {/* Output Canvas Image */}
              <div className="relative aspect-square md:max-w-md mx-auto w-full rounded-lg border border-slate-700 overflow-hidden bg-slate-950 shadow-inner group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.generation.outputImagePath}
                  alt="Generated artistic style render"
                  className="h-full w-full object-cover select-none"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-4 text-left">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Inference Render</p>
                  <p className="text-xs font-semibold text-white line-clamp-1 truncate mt-0.5" title={result.generation.prompt}>
                    {result.generation.prompt}
                  </p>
                </div>
              </div>

              {/* Attribution card and Royalty proof notification */}
              <div className="space-y-4">
                
                {/* Royalty Notification */}
                <div className="rounded-lg bg-emerald-950/80 border border-emerald-500/30 p-4 text-emerald-200">
                  <div className="flex gap-3">
                    <svg className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs leading-relaxed space-y-1 text-left">
                      <p className="font-bold text-emerald-300">
                        Simulated Royalty Credited: {result.royalty.amountCents} {result.royalty.currency}
                      </p>
                      <p className="text-emerald-400 text-[11px]">
                        This proves that each generation can be attributed to a specific artist style.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Technical Metadata Inventory */}
                <div className="rounded-lg bg-slate-800/80 border border-slate-700 p-4 text-left space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 border-b border-slate-700/50 pb-2 flex justify-between items-center">
                    <span>Attribution Details</span>
                    <span className="font-mono text-[9px] text-slate-500 select-all">REQ: {result.generation.id}</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Artist Style</span>
                      <span className="font-semibold text-slate-200">{result.generation.artist.displayName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Layered Adapter</span>
                      <span className="font-semibold text-indigo-300">{result.generation.modelAdapter.adapterName}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-slate-400 block text-[10px] uppercase">Baseline Model</span>
                      <span className="font-mono text-[11px] text-slate-300">{result.generation.modelAdapter.baseModel}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-slate-400 block text-[10px] uppercase">Dataset Version</span>
                      <span className="font-mono text-[11px] text-slate-300">
                        {result.generation.datasetVersion?.versionName || "None connected"}
                      </span>
                    </div>
                  </div>

                  {result.generation.modelAdapter.triggerToken && (
                    <div className="pt-2 border-t border-slate-700/30">
                      <span className="text-slate-400 block text-[10px] uppercase mb-1">Trigger Keywords</span>
                      <code className="font-mono text-xs text-cyan-400 bg-slate-900/50 px-2 py-0.5 rounded border border-cyan-500/20 inline-block">
                        {result.generation.modelAdapter.triggerToken}
                      </code>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-700/30 text-[10px] text-slate-400 flex justify-between items-center font-mono">
                    <span>SEED: {result.generation.seed}</span>
                    <span>SIZE: 1024x1024</span>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* CASE 3: Initial Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-16 relative z-10">
              <div className="h-16 w-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shadow-md">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="space-y-1 px-4">
                <p className="text-sm font-black uppercase tracking-widest text-slate-300">Style Generator Screen</p>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed mx-auto">
                  Select an artist, select a deployment adapter, write a prompt, and trigger a style render to preview output here.
                </p>
              </div>
            </div>
          )}

          {/* Footer Area of right panel showing provider and system state */}
          <div className="border-t border-slate-800/80 pt-4 mt-6 flex justify-between items-center text-[10px] text-slate-500 font-mono relative z-10">
            <span>Inference: {result ? result.generation.modelAdapter.baseModel : "Ready"}</span>
            <span>PROVIDER: {result ? "mock-connector" : "idle"}</span>
          </div>

        </div>
      </div>
    </div>
  );
}
