"use client";

import React, { useEffect, useState } from "react";

interface CountdownToJapanMidnightProps {
  initialSeconds: number;
}

export default function CountdownToJapanMidnight({ initialSeconds }: CountdownToJapanMidnightProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted, secondsLeft]);

  // Static server placeholder to avoid Next.js hydration mismatches
  if (!mounted) {
    return (
      <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-400 bg-slate-800/40 border border-slate-700/50 px-3 py-1.5 rounded-lg">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
        <span>JST LIMIT: --:--:--</span>
      </div>
    );
  }

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;

  const pad = (num: number) => String(num).padStart(2, "0");

  return (
    <div className="inline-flex items-center gap-2 font-mono text-xs font-black tracking-wider text-rose-400 bg-rose-950/30 border border-rose-500/20 px-3 py-1.5 rounded-lg select-none">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
      </span>
      <span>JST COUNTDOWN:</span>
      <span className="text-white font-bold">
        {pad(hours)}:{pad(minutes)}:{pad(secs)}
      </span>
    </div>
  );
}
