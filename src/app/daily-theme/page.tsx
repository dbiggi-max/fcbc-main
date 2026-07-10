import React from "react";
import { prisma } from "@/lib/prisma";
import DailyThemeInterface from "@/components/DailyThemeInterface";
import { DailyTheme, ThemeSubmission } from "@prisma/client";
import { getTodayDateRange } from "@/lib/dates";
import { getJapanDateKey } from "@/lib/daily-theme/date";

import { auth } from "@/lib/auth";

type ActiveThemeWithSubmissions = DailyTheme & {
  themeSubmissions: (ThemeSubmission & {
    artist: { id: string; displayName: string; slug: string } | null;
  })[];
};

export const revalidate = 0; // Dynamic route

export default async function DailyThemePage() {
  let activeTheme: ActiveThemeWithSubmissions | null = null;
  let artists: Parameters<typeof DailyThemeInterface>[0]["artists"] = [];
  let loadError: unknown = null;

  try {
    const session = await auth();
    const currentUserId = session?.user?.id || "anonymous-no-submissions";

    // 1. Query today's active DailyTheme from Prisma, looking at DailyThemeActivation first (Japan Time)
    const todayKey = getJapanDateKey();
    const activation = await prisma.dailyThemeActivation.findUnique({
      where: { dateKey: todayKey },
      include: {
        dailyTheme: {
          include: {
            themeSubmissions: {
              where: {
                userId: currentUserId,
                deletedAt: null,
              },
              include: {
                artist: {
                  select: {
                    id: true,
                    displayName: true,
                    slug: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    });

    if (activation) {
      activeTheme = activation.dailyTheme as any;
    } else {
      // Resilient fallback to legacy machine time lookup
      const { startOfToday, startOfTomorrow } = getTodayDateRange();
      activeTheme = await prisma.dailyTheme.findFirst({
        where: {
          status: "active",
          themeDate: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
        include: {
          themeSubmissions: {
            where: {
              userId: currentUserId,
              deletedAt: null, // Filter out soft-deleted submissions
            },
            include: {
              artist: {
                select: {
                  id: true,
                  displayName: true,
                  slug: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });
    }

    // 2. Query all onboarded artists to populate optional dropdown linkage
    artists = await prisma.artist.findMany({
      select: {
        id: true,
        displayName: true,
        slug: true,
      },
      orderBy: {
        displayName: "asc",
      },
    });
  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    console.error("Database query error inside /daily-theme:", loadError);
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm text-red-950">
          <div className="flex items-center gap-3 text-red-800">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-base font-bold">Theme Query Failure</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            Could not retrieve today&apos;s active drawing challenge records from PostgreSQL.
          </p>
          {loadError instanceof Error && (
            <pre className="mt-4 overflow-auto rounded bg-red-100 p-3 text-xs font-mono text-red-900">
              {loadError.message}
            </pre>
          )}
        </div>
      </div>
    );
  }

  // 3. Handle Empty State when no active theme is scheduled for today
  if (!activeTheme) {
    return (
      <div className="p-6 md:p-8 text-slate-900 flex flex-col justify-center min-h-[70vh]">
        <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm text-center max-w-xl mx-auto space-y-6">
          <div className="h-16 w-16 rounded-full bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-slate-800">No active daily theme challenge</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              No daily theme is active today. If you are developing locally, please run <code className="font-mono bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-200">npx prisma db seed</code> to create or update today&apos;s theme, then restart the dev server and reload this page.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/admin"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow hover:bg-indigo-700 focus:outline-none transition-all cursor-pointer"
            >
              Go to Admin overview
            </a>
          </div>
        </div>
      </div>
    );
  }

  const validatorProvider = (process.env.THEME_VALIDATOR_PROVIDER || "mock").trim().toLowerCase();

  return (
    <div className="p-6 md:p-8 space-y-8 text-slate-900">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5 text-left flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600">
            <span>Sandbox Ingestion</span>
            <span>•</span>
            <span>Daily Drawing Challenge</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Daily Creative Challenge</h1>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
            Submit custom designs matching today&apos;s theme to collect high-fidelity candidate training data.
          </p>
        </div>
        <div className="flex items-center self-start md:self-end">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200 shadow-sm">
            <span className={`h-1.5 w-1.5 rounded-full ${validatorProvider === "python" ? "bg-emerald-500 animate-pulse" : "bg-sky-500 animate-pulse"}`}></span>
            Validator provider: <code className="font-mono font-bold text-slate-900">{validatorProvider}</code>
          </span>
        </div>
      </div>

      {/* Mounting Ingestion Interface Canvas */}
      <DailyThemeInterface
        activeTheme={activeTheme}
        initialSubmissions={activeTheme.themeSubmissions}
        artists={artists}
      />

    </div>
  );
}
