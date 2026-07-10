import type { Metadata } from "next";
import { MainNav } from "@/components/main-nav";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creator Style Lab",
  description:
    "Prototype platform for artist style exploration, image generation, and simulated royalty tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-950">
        <div className="flex min-h-screen flex-col">
          <SessionProvider>
            <MainNav />
            <main className="flex-1">{children}</main>
          </SessionProvider>
        </div>
      </body>
    </html>
  );
}
