import React from "react";
import Link from "next/link";
import TodaysChallengeSection from "@/components/daily-theme/TodaysChallengeSection";

export default function HomePage() {
  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 flex flex-col justify-between">
      
      {/* 1. Stunning Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white py-16 px-6 md:px-8 border-b border-slate-800">
        {/* Abstract vector background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50"></div>
        <div className="absolute top-0 right-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-0.5 text-xs font-black uppercase tracking-widest text-indigo-300">
            CREATOR STYLE LAB • PROTOTYPE
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight max-w-3xl mx-auto">
            For Creators, <span className="text-indigo-400">by Creators</span>
          </h1>
          
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed font-medium">
            Onboard creator profiles, trace datasets, deploy hot-swappable LoRA adapters, run style-isolated inference, and enforce simulated royalty events instantly.
          </p>

          {/* Quick-Action Landing Links */}
          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              href="/generate"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow hover:bg-indigo-700 focus:outline-none transition-all cursor-pointer"
            >
              Open Style Generator
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </Link>
            <Link
              href="/gallery"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-200 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
            >
              View Attribution Gallery
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-200 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
            >
              Control Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Today's Active Drawing Challenge */}
      <TodaysChallengeSection />

      {/* 2. Four-Step "Prototype Flow" Section */}
      <section className="py-16 px-6 md:px-8 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
            The 4-Step Prototype Flow
          </h2>
          <p className="text-slate-500 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
            Trace the secure technical loop linking digital creator consent to immediate financial compensation per render.
          </p>
        </div>

        {/* 4-Step Interactive Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Step 1: Register Artist Style */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow transition-shadow">
            <div className="space-y-3">
              <span className="font-mono text-3xl font-black text-slate-300">01</span>
              <h3 className="text-sm font-black text-slate-800">Register Artist Style</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Establish the creator profile, legal bio information, and status consent record. Builds the baseline registry model.
              </p>
            </div>
            <Link
              href="/admin/artists"
              className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 pt-2"
            >
              Onboard Style &rarr;
            </Link>
          </div>

          {/* Step 2: Dataset & Adapter Pairing */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow transition-shadow">
            <div className="space-y-3">
              <span className="font-mono text-3xl font-black text-slate-300">02</span>
              <h3 className="text-sm font-black text-slate-800">Register separated Dataset</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload image assets, calculate SHA-256 integrity hashes, and register trained LoRA model adapter files.
              </p>
            </div>
            <div className="flex gap-4 pt-2">
              <Link
                href="/admin/datasets"
                className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
              >
                Uploads
              </Link>
              <span className="text-slate-300">|</span>
              <Link
                href="/admin/adapters"
                className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
              >
                Adapters
              </Link>
            </div>
          </div>

          {/* Step 3: Generate Image */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow transition-shadow">
            <div className="space-y-3">
              <span className="font-mono text-3xl font-black text-slate-300">03</span>
              <h3 className="text-sm font-black text-slate-800">Generate Image</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hot-swap style weights instantly inside our creative Studio canvas. Select and apply specific creator parameters.
              </p>
            </div>
            <Link
              href="/generate"
              className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 pt-2"
            >
              Launch Studio &rarr;
            </Link>
          </div>

          {/* Step 4: Log Attribution & Royalty */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow transition-shadow">
            <div className="space-y-3">
              <span className="font-mono text-3xl font-black text-slate-300">04</span>
              <h3 className="text-sm font-black text-slate-800">Log Attribution</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Triggers database transactions crediting 50 JPY simulated royalties to creators, tracing render back to dataset origin.
              </p>
            </div>
            <div className="flex gap-4 pt-2">
              <Link
                href="/gallery"
                className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
              >
                Gallery
              </Link>
              <span className="text-slate-300">|</span>
              <Link
                href="/admin/royalties"
                className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
              >
                Ledger
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Bottom Platform Info Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 md:px-8 text-center text-xs text-slate-400 font-mono">
        <div>FCBC CREATOR STYLE LAB PROTOTYPE PLATFORM LOOP</div>
        <div className="mt-1">DEVELOPED FOR DYNAMIC ARTIST STYLE ISOLATION & VERIFIED ROYALTIES</div>
      </footer>

    </div>
  );
}
