"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { registerArtistProfile } from "../actions";

export default function ArtistRegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [externalProfileUrl, setExternalProfileUrl] = useState("");
  const [consent, setConsent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSlugChange = (val: string) => {
    // Generate valid slug on the fly
    const clean = val.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    setSlug(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    if (!consent) {
      setFormError("You must read and accept the artist consensual training terms to register.");
      setIsLoading(false);
      return;
    }

    const res = await registerArtistProfile({
      displayName,
      slug,
      portfolioUrl,
      externalProfileUrl,
    });

    if (res.success) {
      router.push("/artist/dashboard?success=Registered");
    } else {
      setFormError(res.error || "Failed to register profile.");
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        
        {/* Header Title */}
        <div className="border-b border-slate-100 pb-4 text-center">
          <span className="text-3xl">🎨</span>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-2">
            Register as a Verified Artist
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Become a part of the consensual AI art ecosystem. Share your style signature securely.
          </p>
        </div>

        {/* Error message */}
        {formError && (
          <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs font-bold text-rose-800">
            ⚠️ {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Display Name */}
          <div className="space-y-1">
            <label htmlFor="display-name" className="block text-xs font-black text-slate-600 uppercase">
              Artist Display Name
            </label>
            <input
              id="display-name"
              type="text"
              required
              placeholder="e.g. Katsushika Hokusai"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Style Slug */}
          <div className="space-y-1">
            <label htmlFor="slug" className="block text-xs font-black text-slate-600 uppercase">
              Style Code Slug <span className="text-slate-400 normal-case">(Lowercase, no spaces)</span>
            </label>
            <input
              id="slug"
              type="text"
              required
              placeholder="e.g. hokusai"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
            />
            {slug && (
              <p className="text-[10px] text-indigo-600 font-mono">
                Your custom style identifier will be: <strong>{slug}</strong>
              </p>
            )}
          </div>

          {/* Portfolio Link */}
          <div className="space-y-1">
            <label htmlFor="portfolio-url" className="block text-xs font-black text-slate-600 uppercase">
              Professional Portfolio URL <span className="text-slate-400 normal-case">(Optional)</span>
            </label>
            <input
              id="portfolio-url"
              type="url"
              placeholder="https://myartportfolio.com"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* External Social Profile */}
          <div className="space-y-1">
            <label htmlFor="external-url" className="block text-xs font-black text-slate-600 uppercase">
              Social Link / Artstation <span className="text-slate-400 normal-case">(Optional)</span>
            </label>
            <input
              id="external-url"
              type="url"
              placeholder="https://artstation.com/myprofile"
              value={externalProfileUrl}
              onChange={(e) => setExternalProfileUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Consent / Policy terms checkbox */}
          <div className="relative flex items-start pt-2 border-t border-slate-100">
            <div className="flex h-5 items-center">
              <input
                id="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div className="ml-3 text-xs">
              <label htmlFor="consent" className="font-bold text-slate-700">
                Consensual Style Ingestion Agreement
              </label>
              <p className="text-slate-500 font-medium mt-0.5 leading-normal">
                I hereby grant consent to register my artist style profile. I understand that my drawings submitted with my style profile identifier may be used to compile verified style datasets for secure, opt-in style training and consensual, royalty-bearing generation models.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-indigo-700 hover:shadow-md focus:outline-none transition-all cursor-pointer disabled:opacity-50 mt-4"
          >
            {isLoading ? "Submitting Registration..." : "🚀 Request Verification & Create Profile"}
          </button>

        </form>

      </div>
    </div>
  );
}
