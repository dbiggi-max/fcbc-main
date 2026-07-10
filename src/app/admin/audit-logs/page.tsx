import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminAuditLogManager } from "@/components/AdminAuditLogManager";

export const revalidate = 0; // Dynamic data loading

export default async function AdminAuditLogsPage() {
  let logs: any[] = [];
  let checklist = {
    dataset_image_registered: false,
    model_adapter_registered: false,
    generation_requested: false,
    generation_completed: false,
    royalty_event_created: false,
    daily_theme_submission_created: false,
    daily_theme_submission_validated: false,
    theme_submission_saved_to_dataset: false,
  };
  let loadError: unknown = null;

  try {
    // 1. Fetch all audit logs in descending chronological order
    logs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // 2. Perform existence counts for the 8 major compliance events
    const [
      hasDatasetReg,
      hasAdapterReg,
      hasGenReq,
      hasGenComp,
      hasRoyalty,
      hasThemeSub,
      hasThemeVal,
      hasThemeSaved,
    ] = await Promise.all([
      prisma.auditLog.count({ where: { action: "dataset_image_registered" } }),
      prisma.auditLog.count({ where: { action: "model_adapter_registered" } }),
      prisma.auditLog.count({ where: { action: "generation_requested" } }),
      prisma.auditLog.count({ where: { action: "generation_completed" } }),
      prisma.auditLog.count({ where: { action: "royalty_event_created" } }),
      prisma.auditLog.count({ where: { action: "daily_theme_submission_created" } }),
      prisma.auditLog.count({ where: { action: "daily_theme_submission_validated" } }),
      prisma.auditLog.count({ where: { action: "theme_submission_saved_to_dataset" } }),
    ]);

    checklist = {
      dataset_image_registered: hasDatasetReg > 0,
      model_adapter_registered: hasAdapterReg > 0,
      generation_requested: hasGenReq > 0,
      generation_completed: hasGenComp > 0,
      royalty_event_created: hasRoyalty > 0,
      daily_theme_submission_created: hasThemeSub > 0,
      daily_theme_submission_validated: hasThemeVal > 0,
      theme_submission_saved_to_dataset: hasThemeSaved > 0,
    };

  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    console.error("Failed to query AuditLog events from Prisma:", loadError);
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm text-red-950">
          <div className="flex items-center gap-3 text-red-800">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-base font-bold">Audit Query Failure</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            The database backend could not load governance logs. Please verify that your Prisma connection is online and the `AuditLog` table exists.
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

  return (
    <div className="p-6 md:p-8 space-y-8 text-slate-800">
      
      {/* Title & Governance Explanation Header Panel */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Governance & Audit Logs
          </h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-4xl">
            Explore the historical, tamper-evident record of repository actions, model definitions, generation requests, and royalty calculations.
          </p>
        </div>

        {/* Governance Trail Explanation Alert Banner */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <div className="text-xs text-indigo-950 leading-relaxed">
              <strong className="font-extrabold block text-sm text-indigo-900 mb-1">
                Governance Trail Trail & Proof-of-Consent Notice
              </strong>
              Audit logs show the governance trail for the prototype: dataset registration, model adapter registration, generation requests, simulated royalty events, Daily Theme validation, and admin dataset-ingestion decisions. This helps prove that per-artist attribution and data usage decisions are traceable.
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs empty state fallback */}
      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm max-w-2xl mx-auto space-y-4">
          <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">No governance logs found</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              No audit logs yet. Complete actions such as registering dataset images, generating images, or reviewing Daily Theme submissions to create governance events.
            </p>
          </div>
          <div className="pt-2">
            <Link 
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 uppercase shadow-2xs"
            >
              Go to Admin Dashboard
            </Link>
          </div>
        </div>
      ) : (
        /* Render stateful manager component loaded with retrieved values */
        <AdminAuditLogManager initialLogs={logs} checklist={checklist} />
      )}

    </div>
  );
}
