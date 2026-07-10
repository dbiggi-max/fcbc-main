import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security";
import Link from "next/link";
import { redirect } from "next/navigation";
import { softDeleteSubmission } from "./actions";
import { revalidatePath } from "next/cache";

export const revalidate = 0; // Dynamic rendering

export default async function DashboardPage() {
  // 1. Authenticate user or redirect to Google Login
  const user = await requireUser();

  // 2. Query user's non-deleted submissions
  const submissions = await prisma.themeSubmission.findMany({
    where: {
      userId: user.id,
      deletedAt: null, // Only active submissions
    },
    include: {
      dailyTheme: true,
      artist: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 3. Compute simple overview metrics
  const totalCount = submissions.length;
  const acceptedCount = submissions.filter((s) => s.effectiveStatus === "accepted" || s.validationStatus === "accepted").length;
  const pendingCount = submissions.filter((s) => s.effectiveStatus === "pending" || s.validationStatus === "pending").length;
  const borderlineCount = submissions.filter((s) => s.effectiveStatus === "borderline" || s.validationStatus === "borderline").length;

  // 4. Soft-delete handle helper for server-side form submission
  async function handleDelete(formData: FormData) {
    "use server";
    const subId = formData.get("submissionId") as string;
    if (subId) {
      await softDeleteSubmission(subId);
      revalidatePath("/dashboard");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Premium Header Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {user.name || "Creator"}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your consensual drawing submissions, verify status, and explore style profiles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
            Role: {user.role}
          </span>
          {user.role === "USER" && (
            <Link
              href="/artist/register"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-all cursor-pointer"
            >
              🎨 Apply as Artist
            </Link>
          )}
          {(user.role === "ARTIST" || user.role === "ADMIN") && (
            <Link
              href="/artist/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-violet-500 transition-all cursor-pointer"
            >
              🚀 Artist Portal
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Submissions</span>
          <span className="text-2xl font-black text-slate-900 mt-2">{totalCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accepted Renders</span>
          <span className="text-2xl font-black text-emerald-600 mt-2">{acceptedCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Review</span>
          <span className="text-2xl font-black text-amber-500 mt-2">{pendingCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Borderline Queue</span>
          <span className="text-2xl font-black text-indigo-500 mt-2">{borderlineCount}</span>
        </div>
      </div>

      {/* Submissions List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Your Drawing Portfolio</h2>
        </div>
        
        {submissions.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-4">
            <span className="text-4xl">🎨</span>
            <h3 className="text-sm font-bold text-slate-800">No active drawings found</h3>
            <p className="text-xs text-slate-400">
              Submit your very first sketch or uploaded illustration in our daily drawing challenge to build your style laboratory!
            </p>
            <Link
              href="/daily-theme"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all cursor-pointer"
            >
              Participate in Daily Theme
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Preview</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Theme / Prompt</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Style Link</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Validation Status</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {submissions.map((sub) => {
                  const status = sub.effectiveStatus || sub.validationStatus;
                  const isAccepted = status === "accepted";
                  const isRejected = status === "rejected";
                  const isBorderline = status === "borderline";

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Image Preview */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-12 w-12 rounded border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sub.imagePath}
                            alt="Submission preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </td>

                      {/* Theme and Caption Info */}
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-900">{sub.dailyTheme.themeText}</div>
                        <div className="text-xs text-slate-500 mt-1 font-mono max-w-sm truncate" title={sub.promptOrCaption || ""}>
                          {sub.promptOrCaption || "No caption provided"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Submitted {new Date(sub.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Linking Style Profile */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-600">
                        {sub.artist ? (
                          <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-700/10">
                            🎨 {sub.artist.displayName}
                          </span>
                        ) : (
                          <span className="text-slate-400">General user</span>
                        )}
                      </td>

                      {/* Validation Badges */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isAccepted && (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/10">
                            Unsuitable
                          </span>
                        )}
                        {isBorderline && (
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/10">
                            Borderline Review
                          </span>
                        )}
                        {status === "pending" && (
                          <span className="inline-flex items-center rounded-md bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-600/10 animate-pulse">
                            Processing
                          </span>
                        )}
                      </td>

                      {/* Delete actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <form action={handleDelete} className="inline-block">
                          <input type="hidden" name="submissionId" value={sub.id} />
                          <button
                            type="submit"
                            className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded px-2.5 py-1.5 cursor-pointer transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
