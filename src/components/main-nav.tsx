"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function MainNav() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  return (
    <header className="border-b border-slate-200 bg-white/95 sticky top-0 z-50 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex flex-col">
          <span className="text-base font-black tracking-tight text-slate-900 bg-gradient-to-r from-indigo-600 to-violet-700 bg-clip-text text-transparent">
            creator-style-lab
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Internal prototype console
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            Home
          </Link>
          <Link
            href="/generate"
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            Generate
          </Link>
          <Link
            href="/gallery"
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            Gallery
          </Link>
          <Link
            href="/gallery/submissions"
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            Sketches
          </Link>
          <Link
            href="/daily-theme"
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            Daily Theme
          </Link>

          {/* Conditional links based on roles */}
          {status === "authenticated" && (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50"
              >
                Dashboard
              </Link>
              {(role === "ARTIST" || role === "ADMIN") && (
                <Link
                  href="/artist/dashboard"
                  className="rounded-md px-3 py-1.5 text-xs font-bold text-violet-600 transition-colors hover:bg-violet-50"
                >
                  Artist Portal
                </Link>
              )}
              {role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="rounded-md px-3 py-1.5 text-xs font-bold text-emerald-600 transition-colors hover:bg-emerald-50"
                >
                  Admin
                </Link>
              )}
              
              {/* User badge and Logout button */}
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-2.5 py-1">
                  {session.user.name || session.user.email} ({role})
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-md bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}

          {status === "unauthenticated" && (
            <div className="flex items-center ml-4 pl-4 border-l border-slate-200">
              <Link
                href="/api/auth/signin"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 cursor-pointer"
              >
                Sign In
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
