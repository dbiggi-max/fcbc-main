"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "./actions";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginAdmin(password);
      if (result.success) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("An unexpected runtime exception occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Visual background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10 space-y-8">
        <div className="text-center space-y-2">
          {/* Neon-themed brand logo */}
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(99,102,241,0.3)] animate-pulse border border-indigo-400/20">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-4 bg-clip-text bg-gradient-to-r from-slate-100 via-indigo-200 to-slate-200">
            FCBC Core Console
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Authorized admin credentials required. Access logs and operations are cryptographically tracked.
          </p>
        </div>

        {/* Glassmorphic Login Box */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl space-y-6 relative">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="password-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Security Passcode
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrative password..."
                  required
                  className="w-full bg-slate-950/80 border border-slate-800/80 text-white rounded-lg px-4 py-3 text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono tracking-widest"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 8a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400 flex items-start gap-2.5 animate-shake">
                <svg className="h-4 w-4 mt-0.5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="leading-relaxed font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verifying security key...</span>
                </>
              ) : (
                <span>Access Admin Terminal</span>
              )}
            </button>
          </form>

          {/* Secure footer hints */}
          <div className="text-center">
            <span className="text-[10px] text-slate-600 font-mono">
              IP: SECURE SSL TUNNEL ACTIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
