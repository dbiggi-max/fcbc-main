import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import Link from "next/link";
import { adminCreateScheduledTheme, adminToggleThemeStatus } from "./actions";
import { revalidatePath } from "next/cache";

export const revalidate = 0; // Force live feed re-render

export default async function AdminThemesPage() {
  // Ensure the user is an administrator
  const admin = await requireAdmin();

  // 1. Fetch future scheduled themes
  const scheduledThemes = await prisma.dailyTheme.findMany({
    where: {
      status: "SCHEDULED",
    },
    orderBy: {
      scheduledForDateKey: "asc",
    },
  });

  // 2. Fetch past and present theme activations
  const activations = await prisma.dailyThemeActivation.findMany({
    include: {
      dailyTheme: true,
    },
    orderBy: {
      dateKey: "desc",
    },
    take: 50,
  });

  // Server-side form action handler to create a theme
  async function handleCreateTheme(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const rules = formData.get("rules") as string;
    const scheduledForDateKey = formData.get("scheduledForDateKey") as string;

    if (!title || !description || !rules || !scheduledForDateKey) {
      return;
    }

    const res = await adminCreateScheduledTheme({
      title,
      description,
      rules,
      scheduledForDateKey,
    });

    if (res.success) {
      revalidatePath("/admin/themes");
    }
  }

  // Server-side action handler to toggle status
  async function handleToggleStatus(formData: FormData) {
    "use server";
    const themeId = formData.get("themeId") as string;
    const status = formData.get("status") as any;

    if (themeId && status) {
      await adminToggleThemeStatus(themeId, status);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-8 text-slate-900">
      
      {/* Header Panel */}
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <span>Admin Console</span>
            <span>•</span>
            <span>Theme Operations</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Daily Theme Scheduling & Rotation
          </h1>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
            Manage future drawing challenges or review active/generated fallback history for the `Asia/Tokyo` timezone.
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold px-4 py-2 text-xs hover:bg-slate-200 transition shrink-0"
        >
          &larr; Back to Admin Overview
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form to Schedule Future Theme */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 h-fit lg:col-span-1">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
            📅 Schedule Drawing Challenge
          </h2>

          <form action={handleCreateTheme} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="title" className="text-[10px] font-bold text-slate-400 uppercase">
                Challenge Prompt / Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="e.g. Majestic Flying Dragon"
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="scheduledForDateKey" className="text-[10px] font-bold text-slate-400 uppercase">
                Target Date (Japan Time)
              </label>
              <input
                id="scheduledForDateKey"
                name="scheduledForDateKey"
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
              <p className="text-[10px] text-slate-400 italic">
                Theme will automatically activate at 00:00 JST on this date.
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="description" className="text-[10px] font-bold text-slate-400 uppercase">
                Description / Context
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                placeholder="Describe the mood, color themes, and context for sketching..."
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="rules" className="text-[10px] font-bold text-slate-400 uppercase">
                Challenge Rules & Constraints
              </label>
              <textarea
                id="rules"
                name="rules"
                required
                rows={3}
                placeholder="e.g., must draw wings clearly, focus on detailed scale shading..."
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs transition uppercase tracking-wider"
            >
              Add Scheduled Theme
            </button>
          </form>
        </div>

        {/* Right Column: Scheduled Themes & Active History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Upcoming scheduled list */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>🚀 Upcoming Scheduled Challenges</span>
              <span className="bg-indigo-50 text-indigo-700 font-mono text-[10px] rounded-full px-2.5 py-0.5">
                {scheduledThemes.length} Queued
              </span>
            </h2>

            {scheduledThemes.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 italic text-center">
                No themes are scheduled. The system will automatically use generative AI fallback challenges at Tokyo midnight.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {scheduledThemes.map((theme) => (
                  <div key={theme.id} className="py-4 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {theme.scheduledForDateKey}
                        </span>
                        <span className="font-bold text-xs text-slate-800">{theme.themeText}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{theme.description}</p>
                    </div>

                    <form action={handleToggleStatus}>
                      <input type="hidden" name="themeId" value={theme.id} />
                      <input type="hidden" name="status" value="DISABLED" />
                      <button
                        type="submit"
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-100 rounded px-2.5 py-1 transition cursor-pointer"
                      >
                        Cancel / Disable
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Activation History list */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
              🏛️ Theme Rotation History (Last 50 Days)
            </h2>

            {activations.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 italic text-center">
                No active themes have been logged in the rotation database yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 pr-4">Japan Date</th>
                      <th className="py-3 px-4">Challenge Prompt</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Trigger</th>
                      <th className="py-3 pl-4">Activated At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {activations.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 pr-4 font-mono font-bold text-slate-700">{act.dateKey}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800">{act.dailyTheme.themeText}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{act.dailyTheme.description}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              act.source === "ADMIN"
                                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-700/10"
                                : "bg-teal-50 text-teal-700 ring-1 ring-teal-700/10"
                            }`}
                          >
                            {act.source}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500 uppercase">{act.triggerSource}</td>
                        <td className="py-3 pl-4 text-[10px] text-slate-400 font-mono">
                          {new Date(act.activatedAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
