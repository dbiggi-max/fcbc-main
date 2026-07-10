import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/security";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Guard with belt-and-suspenders admin check
  await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col md:flex-row">
      <AdminNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
