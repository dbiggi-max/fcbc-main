import React from "react";

// Status colors mapping
const STATUS_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20" },
  registered: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-600/20" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20" },
  
  pending: { bg: "bg-amber-50", text: "text-amber-800", ring: "ring-amber-600/10" },
  draft: { bg: "bg-amber-50", text: "text-amber-800", ring: "ring-amber-600/10" },
  queued: { bg: "bg-amber-50", text: "text-amber-800", ring: "ring-amber-600/10" },
  
  uploaded_pending_review: { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-600/20" },
  approved_for_training: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20" },
  candidate_from_daily_theme: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-600/20" },
  
  simulated: { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-600/10" },
  processing: { bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-600/10" },
  
  failed: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-600/10" },
  disabled: { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-500/10" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-500/10" },

  // Model Adapter specific statuses
  placeholder_registered: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", ring: "ring-fuchsia-600/20" },
  training: { bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-600/20" },
  ready: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20" },
};

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normStatus = status.toLowerCase();
  const colors = STATUS_COLORS[normStatus] || {
    bg: "bg-slate-50",
    text: "text-slate-600",
    ring: "ring-slate-500/10",
  };

  let label = status.replace(/_/g, " ");
  if (normStatus === "candidate_from_daily_theme") {
    label = "Daily Theme Candidate";
  } else {
    // Capitalize label
    label = label.charAt(0).toUpperCase() + label.slice(1);
  }

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring}`}
    >
      {label}
    </span>
  );
}

type EmptyStateProps = {
  message: string;
  subtitle?: string;
};

export function EmptyState({ message, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-200">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0h18M2.25 13.5l1.125-11.25h17.25l1.125 11.25M3 13.5h18M4 17h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2a1 1 0 011-1z"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{message}</h3>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

type AdminMetricCardProps = {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  description?: string;
};

export function AdminMetricCard({ title, value, icon, description }: AdminMetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide uppercase text-slate-500">
          {title}
        </span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline">
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
      </div>
      {description && (
        <p className="mt-1 text-xs text-slate-500 leading-normal">
          {description}
        </p>
      )}
    </div>
  );
}

type AdminTableHeaderProps = {
  title: string;
  subtitle?: string;
  badgeCount?: number;
};

export function AdminTableHeader({ title, subtitle, badgeCount }: AdminTableHeaderProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          {badgeCount !== undefined && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200">
              {badgeCount}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed max-w-2xl">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
