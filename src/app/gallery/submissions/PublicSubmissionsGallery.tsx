"use client";

import React, { useState } from "react";

interface SubmissionLite {
  id: string;
  imagePath: string;
  promptOrCaption: string | null;
  publishedAt: string | Date | null;
  dailyTheme: {
    themeText: string;
    description: string | null;
  };
  user: {
    name: string | null;
    email: string | null;
  } | null;
}

interface PublicSubmissionsGalleryProps {
  submissions: SubmissionLite[];
}

export default function PublicSubmissionsGallery({ submissions }: PublicSubmissionsGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThemeText, setSelectedThemeText] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionLite | null>(null);

  // Get unique theme titles for drop-down filter
  const uniqueThemes = Array.from(
    new Set(submissions.map((sub) => sub.dailyTheme.themeText))
  ).sort();

  // Filter logic
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.dailyTheme.themeText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.promptOrCaption && sub.promptOrCaption.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesThemeSelect =
      !selectedThemeText || sub.dailyTheme.themeText === selectedThemeText;

    return matchesSearch && matchesThemeSelect;
  });

  return (
    <div className="space-y-6">
      {/* Interactive Filters Panel */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        {/* Text Search input */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by theme title or caption..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Dropdown theme filter */}
        <div className="w-full md:w-64">
          <select
            value={selectedThemeText}
            onChange={(e) => setSelectedThemeText(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
          >
            <option value="">-- Filter by Challenge Theme --</option>
            {uniqueThemes.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filter button */}
        {(searchQuery || selectedThemeText) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedThemeText("");
            }}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-lg transition shrink-0"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Grid Display */}
      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto space-y-3">
          <span className="text-4xl">🔍</span>
          <p className="text-sm font-bold text-slate-800">No drawings match your filter criteria</p>
          <p className="text-xs text-slate-400">
            Try adjusting your keyword query or select another challenge theme to find drawings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubmissions.map((sub) => (
            <div
              key={sub.id}
              onClick={() => setSelectedSubmission(sub)}
              className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col h-full"
            >
              {/* Image Preview Canvas */}
              <div className="h-56 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sub.imagePath}
                  alt={sub.dailyTheme.themeText}
                  className="object-contain max-h-full max-w-full transition-transform duration-500 group-hover:scale-[1.03]"
                />
                
                {/* Theme date overlay badge */}
                {sub.publishedAt && (
                  <span className="absolute right-3 bottom-3 rounded bg-slate-900/80 backdrop-blur px-2.5 py-0.5 text-[9px] font-bold text-white shadow">
                    Curated: {new Date(sub.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Text metadata footer content */}
              <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight leading-snug">
                    {sub.dailyTheme.themeText}
                  </h3>
                  
                  {sub.promptOrCaption && (
                    <p className="text-xs text-slate-500 italic line-clamp-2 mt-1">
                      &ldquo;{sub.promptOrCaption}&rdquo;
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold flex items-center gap-1">
                    👤 Creator: <span className="font-mono text-slate-600">{sub.user?.name || "Anonymous Sketcher"}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal Draw View */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[550px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Column: Drawing view */}
            <div className="flex-1 bg-slate-900 relative flex items-center justify-center h-1/2 md:h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedSubmission.imagePath}
                alt={selectedSubmission.dailyTheme.themeText}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Right Column: Narrative Info */}
            <div className="w-full md:w-80 p-6 flex flex-col justify-between h-1/2 md:h-full border-t md:border-t-0 md:border-l border-slate-200 bg-white">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Curated Submission
                  </span>
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                    {selectedSubmission.dailyTheme.themeText}
                  </h2>
                  {selectedSubmission.dailyTheme.description && (
                    <p className="text-xs text-slate-400">
                      {selectedSubmission.dailyTheme.description}
                    </p>
                  )}
                </div>

                {selectedSubmission.promptOrCaption && (
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs italic text-slate-600">
                    &ldquo;{selectedSubmission.promptOrCaption}&rdquo;
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="text-xs space-y-1">
                  <p className="text-slate-400">Contributor</p>
                  <p className="font-bold text-slate-800">{selectedSubmission.user?.name || "Anonymous Sketcher"}</p>
                </div>

                {selectedSubmission.publishedAt && (
                  <div className="text-xs space-y-1">
                    <p className="text-slate-400">Selection Date</p>
                    <p className="font-mono text-slate-800">
                      {new Date(selectedSubmission.publishedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-lg transition"
                >
                  Close Showcase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
