import Link from "next/link";
import { adminNavItems } from "@/lib/routes";

export function AdminNav() {
  return (
    <aside className="border-b border-slate-200 bg-white p-4 md:w-64 md:border-r md:border-b-0 md:p-6">
      <div className="md:sticky md:top-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Admin
        </p>
        <nav
          aria-label="Admin navigation"
          className="mt-4 flex gap-2 overflow-x-auto md:flex-col md:overflow-visible"
        >
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
