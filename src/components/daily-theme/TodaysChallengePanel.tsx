import React from "react";
import { getCurrentDailyTheme } from "@/lib/daily-theme/queries";
import { getSecondsUntilJapanMidnight } from "@/lib/daily-theme/date";
import CountdownToJapanMidnight from "./CountdownToJapanMidnight";

export default async function TodaysChallengePanel() {
  const activeTheme = await getCurrentDailyTheme();
  const secondsLeft = getSecondsUntilJapanMidnight();

  if (!activeTheme) {
    return null; // Don't disrupt page flow if none active
  }

  return (
    <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Today&apos;s Active Challenge</span>
        </div>
        <p className="text-sm font-black text-white">
          &ldquo;{activeTheme.themeText}&rdquo;
        </p>
        <p className="text-[10px] text-slate-400 leading-relaxed font-medium line-clamp-1 max-w-xl">
          {activeTheme.description}
        </p>
      </div>

      <div className="shrink-0 flex items-center">
        <CountdownToJapanMidnight initialSeconds={secondsLeft} />
      </div>
    </div>
  );
}
