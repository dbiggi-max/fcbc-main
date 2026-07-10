"use client";

import React, { useState } from "react";
import { saveGlobalSettingsAction, saveThemeOverrideSettingsAction } from "./actions";

interface DailyThemeLite {
  id: string;
  themeText: string;
  description: string | null;
  themeDate: string | Date;
  minThemeMatchScore: number | null;
  minQualityScore: number | null;
  minEffortScore: number | null;
  maxSpamScore: number | null;
  maxSimplicityScore: number | null;
}

interface SettingsWorkspaceProps {
  initialGlobalSettings: {
    minThemeMatchScore: number;
    minQualityScore: number;
    minEffortScore: number;
    maxSpamScore: number;
    maxSimplicityScore: number;
  };
  themes: DailyThemeLite[];
}

export default function SettingsWorkspace({
  initialGlobalSettings,
  themes,
}: SettingsWorkspaceProps) {
  // Global Thresholds state
  const [globalMatch, setGlobalMatch] = useState(initialGlobalSettings.minThemeMatchScore);
  const [globalQuality, setGlobalQuality] = useState(initialGlobalSettings.minQualityScore);
  const [globalEffort, setGlobalEffort] = useState(initialGlobalSettings.minEffortScore);
  const [globalSpam, setGlobalSpam] = useState(initialGlobalSettings.maxSpamScore);
  const [globalSimplicity, setGlobalSimplicity] = useState(initialGlobalSettings.maxSimplicityScore);

  // Per-theme Custom Overrides state
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [themeMatch, setThemeMatch] = useState<number | null>(null);
  const [themeQuality, setThemeQuality] = useState<number | null>(null);
  const [themeEffort, setThemeEffort] = useState<number | null>(null);
  const [themeSpam, setThemeSpam] = useState<number | null>(null);
  const [themeSimplicity, setThemeSimplicity] = useState<number | null>(null);

  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSelectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    const theme = themes.find((t) => t.id === themeId);
    if (theme) {
      setThemeMatch(theme.minThemeMatchScore);
      setThemeQuality(theme.minQualityScore);
      setThemeEffort(theme.minEffortScore);
      setThemeSpam(theme.maxSpamScore);
      setThemeSimplicity(theme.maxSimplicityScore);
    } else {
      setThemeMatch(null);
      setThemeQuality(null);
      setThemeEffort(null);
      setThemeSpam(null);
      setThemeSimplicity(null);
    }
  };

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGlobal(true);

    try {
      const res = await saveGlobalSettingsAction({
        minThemeMatchScore: globalMatch,
        minQualityScore: globalQuality,
        minEffortScore: globalEffort,
        maxSpamScore: globalSpam,
        maxSimplicityScore: globalSimplicity,
      });

      if (res.success) {
        showToast("Global threshold defaults successfully updated and audited.", "success");
      } else {
        showToast("Failed to save global configurations.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An unexpected error occurred.", "error");
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const handleSaveThemeOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThemeId) return;
    setIsSavingTheme(true);

    try {
      const res = await saveThemeOverrideSettingsAction(selectedThemeId, {
        minThemeMatchScore: themeMatch,
        minQualityScore: themeQuality,
        minEffortScore: themeEffort,
        maxSpamScore: themeSpam,
        maxSimplicityScore: themeSimplicity,
      });

      if (res.success) {
        showToast("Theme-specific overrides successfully configured and audited.", "success");
        // Update local object representation
        const idx = themes.findIndex((t) => t.id === selectedThemeId);
        if (idx !== -1) {
          themes[idx].minThemeMatchScore = themeMatch;
          themes[idx].minQualityScore = themeQuality;
          themes[idx].minEffortScore = themeEffort;
          themes[idx].maxSpamScore = themeSpam;
          themes[idx].maxSimplicityScore = themeSimplicity;
        }
      } else {
        showToast("Failed to write theme overrides.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An unexpected error occurred.", "error");
    } finally {
      setIsSavingTheme(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-xl transition-all duration-300 border ${
          toast.type === "success" ? "bg-emerald-950 border-emerald-500/30 text-emerald-200" : "bg-rose-950 border-rose-500/30 text-rose-200"
        }`}>
          <div className={`h-2 w-2 rounded-full ${toast.type === "success" ? "bg-emerald-400" : "bg-rose-400"}`} />
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Header Area */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          ⚙️ Validation Threshold Configuration
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Calibrate Gemini AI scoring parameters. Configured changes are strictly logged for auditing and do not retroactively modify historical evaluations automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Global Configuration Workspace (Left/Middle 2 Columns) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Global Defaults Card Form */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">🌍 System-wide Default Thresholds</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                These boundary scores apply globally unless overridden on specific daily themes.
              </p>
            </div>

            <form onSubmit={handleSaveGlobal} className="space-y-6">
              
              {/* Sliders loop */}
              <div className="space-y-4">
                {/* Theme Match Score */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                      🎯 Minimum Theme Match
                      <span className="text-[10px] text-slate-500 font-normal">Approved: Score &ge; value</span>
                    </label>
                    <span className="font-mono text-indigo-400 font-bold">{globalMatch}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={globalMatch}
                    onChange={(e) => setGlobalMatch(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Quality Score */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                      ⭐ Minimum Aesthetic/Visual Quality
                      <span className="text-[10px] text-slate-500 font-normal">Approved: Score &ge; value</span>
                    </label>
                    <span className="font-mono text-indigo-400 font-bold">{globalQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={globalQuality}
                    onChange={(e) => setGlobalQuality(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Effort Score */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                      💪 Minimum Human Effort
                      <span className="text-[10px] text-slate-500 font-normal">Approved: Score &ge; value</span>
                    </label>
                    <span className="font-mono text-indigo-400 font-bold">{globalEffort}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={globalEffort}
                    onChange={(e) => setGlobalEffort(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Simplicity Score */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                      📏 Maximum Simplicity / Low-Effort Tolerance
                      <span className="text-[10px] text-slate-500 font-normal">Approved: Score &le; value</span>
                    </label>
                    <span className="font-mono text-indigo-400 font-bold">{globalSimplicity}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={globalSimplicity}
                    onChange={(e) => setGlobalSimplicity(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Spam Score */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                      ⚠️ Maximum Obvious Spam Score
                      <span className="text-[10px] text-slate-500 font-normal">Approved: Score &le; value</span>
                    </label>
                    <span className="font-mono text-indigo-400 font-bold">{globalSpam}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={globalSpam}
                    onChange={(e) => setGlobalSpam(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingGlobal}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-5 rounded-lg transition shadow"
                >
                  {isSavingGlobal ? "Saving defaults..." : "Save Global Defaults"}
                </button>
              </div>
            </form>
          </div>

          {/* Theme-Specific Configuration Overrides */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">🗓️ Per-Theme Specific Threshold Overrides</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Override default limits for individual active or upcoming daily challenges.
              </p>
            </div>

            <div className="space-y-6">
              {/* Select box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Daily Theme to Edit
                </label>
                <select
                  value={selectedThemeId}
                  onChange={(e) => handleSelectTheme(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose a Theme --</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {new Date(t.themeDate).toLocaleDateString()} - {t.themeText}
                    </option>
                  ))}
                </select>
              </div>

              {selectedThemeId && (
                <form onSubmit={handleSaveThemeOverride} className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg text-xs leading-relaxed text-indigo-300">
                    ℹ️ Leaving parameters unchecked/null forces the validation engine to fall back to the system-wide global defaults configured above.
                  </div>

                  {/* Theme overrides sliders */}
                  <div className="space-y-5">
                    {/* Overrides Theme Match */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <label className="flex items-center gap-2 text-slate-300">
                          <input
                            type="checkbox"
                            checked={themeMatch !== null}
                            onChange={(e) => setThemeMatch(e.target.checked ? 75 : null)}
                            className="rounded bg-slate-950 border-slate-800 text-indigo-500"
                          />
                          Override Min Theme Match
                        </label>
                        {themeMatch !== null && <span className="font-mono text-indigo-400 font-bold">{themeMatch}%</span>}
                      </div>
                      {themeMatch !== null && (
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={themeMatch}
                          onChange={(e) => setThemeMatch(Number(e.target.value))}
                          className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      )}
                    </div>

                    {/* Overrides Quality */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <label className="flex items-center gap-2 text-slate-300">
                          <input
                            type="checkbox"
                            checked={themeQuality !== null}
                            onChange={(e) => setThemeQuality(e.target.checked ? 50 : null)}
                            className="rounded bg-slate-950 border-slate-800 text-indigo-500"
                          />
                          Override Min Aesthetic/Quality
                        </label>
                        {themeQuality !== null && <span className="font-mono text-indigo-400 font-bold">{themeQuality}%</span>}
                      </div>
                      {themeQuality !== null && (
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={themeQuality}
                          onChange={(e) => setThemeQuality(Number(e.target.value))}
                          className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      )}
                    </div>

                    {/* Overrides Effort */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <label className="flex items-center gap-2 text-slate-300">
                          <input
                            type="checkbox"
                            checked={themeEffort !== null}
                            onChange={(e) => setThemeEffort(e.target.checked ? 40 : null)}
                            className="rounded bg-slate-950 border-slate-800 text-indigo-500"
                          />
                          Override Min Human Effort
                        </label>
                        {themeEffort !== null && <span className="font-mono text-indigo-400 font-bold">{themeEffort}%</span>}
                      </div>
                      {themeEffort !== null && (
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={themeEffort}
                          onChange={(e) => setThemeEffort(Number(e.target.value))}
                          className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      )}
                    </div>

                    {/* Overrides Simplicity */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <label className="flex items-center gap-2 text-slate-300">
                          <input
                            type="checkbox"
                            checked={themeSimplicity !== null}
                            onChange={(e) => setThemeSimplicity(e.target.checked ? 60 : null)}
                            className="rounded bg-slate-950 border-slate-800 text-indigo-500"
                          />
                          Override Max Simplicity / Tolerance
                        </label>
                        {themeSimplicity !== null && <span className="font-mono text-indigo-400 font-bold">{themeSimplicity}%</span>}
                      </div>
                      {themeSimplicity !== null && (
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={themeSimplicity}
                          onChange={(e) => setThemeSimplicity(Number(e.target.value))}
                          className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      )}
                    </div>

                    {/* Overrides Spam */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <label className="flex items-center gap-2 text-slate-300">
                          <input
                            type="checkbox"
                            checked={themeSpam !== null}
                            onChange={(e) => setThemeSpam(e.target.checked ? 30 : null)}
                            className="rounded bg-slate-950 border-slate-800 text-indigo-500"
                          />
                          Override Max Spam Score
                        </label>
                        {themeSpam !== null && <span className="font-mono text-indigo-400 font-bold">{themeSpam}%</span>}
                      </div>
                      {themeSpam !== null && (
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={themeSpam}
                          onChange={(e) => setThemeSpam(Number(e.target.value))}
                          className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingTheme}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-5 rounded-lg transition shadow"
                    >
                      {isSavingTheme ? "Saving theme overrides..." : "Save Custom Overrides"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info & Safety Panels (1 Column) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Quick link back to moderation */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              📋 Go to Moderation Panel
            </h3>
            <p className="text-xs text-slate-400">
              Apply overrides, trigger manual revalidation, or manage public gallery showcases.
            </p>
            <a
              href="/admin/moderation"
              className="block text-center text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition"
            >
              Moderation Workspace
            </a>
          </div>

          {/* Historical integrity caution panel */}
          <div className="bg-amber-950/20 border border-amber-500/20 p-5 rounded-xl space-y-3">
            <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
              ⚠️ Historical Calibration Rules
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Updating thresholds changes the decision boundary applied to all **future submissions** or **manual revalidation requests** only.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Previously processed drawings are **not** retroactively evaluated automatically to avoid massive, bulk API transaction fees on Vertex AI.
            </p>
            <div className="text-[10px] text-amber-500 font-semibold border-t border-amber-500/10 pt-2">
              💡 Need to revalidate? Run a manual revalidation via the bulk tools on the Moderation Workspace.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
