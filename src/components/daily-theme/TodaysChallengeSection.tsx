import React from "react";
import Link from "next/link";
import { getCurrentDailyTheme } from "@/lib/daily-theme/queries";
import { getSecondsUntilJapanMidnight } from "@/lib/daily-theme/date";
import CountdownToJapanMidnight from "./CountdownToJapanMidnight";

export default async function TodaysChallengeSection() {
  const activeTheme = await getCurrentDailyTheme();
  const secondsLeft = getSecondsUntilJapanMidnight();

  if (!activeTheme) {
    return (
      <section className="py-12 px-6 md:px-8 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">No Active Challenge Scheduled</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            The database hasn&apos;t generated today&apos;s drawing topic yet. Run the theme rotation background task or trigger it via the admin dashboard.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/themes"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 text-slate-200 font-bold px-4 py-2 text-xs hover:bg-slate-700 transition"
            >
              Configure Themes
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-6 md:px-8 max-w-5xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-6 md:p-8 shadow-xl text-white space-y-6">
        
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:20px_24px] pointer-events-none opacity-40"></div>
        <div className="absolute top-1/2 right-10 -translate-y-1/2 h-44 w-44 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-300">
              ⚡ LIVE CHALLENGE
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1.5">
              Today&apos;s Creative Drawing Challenge
            </h2>
          </div>

          <CountdownToJapanMidnight initialSeconds={secondsLeft} />
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          {/* Main prompt info */}
          <div className="md:col-span-2 space-y-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">THEME PROMPT</span>
              <p className="text-lg md:text-xl font-black text-indigo-300 leading-tight">
                &ldquo;{activeTheme.themeText}&rdquo;
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CREATIVE DIRECTIVE</span>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {activeTheme.description || "Grab your digital stylus and express your interpretation of today's unique theme prompt."}
              </p>
            </div>
          </div>

          {/* Guidelines Box */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 md:col-span-1 space-y-2.5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">SCORING CONSTRAINTS</span>
            
            {activeTheme.description && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block">Specific Rules:</span>
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  Focus on geometric outlines, perspective depth, and clean shadow-hatch elements.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] border-t border-slate-800/40">
              <div className="space-y-0.5">
                <span className="text-slate-500">Min Match:</span>
                <span className="font-mono text-indigo-300 font-bold block">{activeTheme.minThemeMatchScore ?? 75}%</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-500">Min Effort:</span>
                <span className="font-mono text-indigo-300 font-bold block">{activeTheme.minEffortScore ?? 40}%</span>
              </div>
            </div>
          </div>

        </div>

        {/* CTA Actions */}
        <div className="relative z-10 pt-4 border-t border-slate-800/60 flex flex-wrap gap-3">
          <Link
            href="/daily-theme"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow hover:bg-indigo-700 transition"
          >
            Sketch This Topic Now
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </Link>
          <Link
            href="/gallery/submissions"
            className="inline-flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            Explore Submissions
          </Link>
        </div>

      </div>
    </section>
  );
}
