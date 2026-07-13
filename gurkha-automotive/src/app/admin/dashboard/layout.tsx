import Link from "next/link";
import { BUSINESS } from "@/lib/constants";
import SignOutButton from "@/components/admin/SignOutButton";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-200">
      <header className="border-b border-asphalt-600 bg-asphalt-800">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-sm bg-amber-500 font-display text-lg font-bold text-asphalt-900">
              GA
            </span>
            <span className="font-display text-base font-semibold uppercase tracking-wide text-cream-100">
              {BUSINESS.name} <span className="text-cream-100/50">· Admin</span>
            </span>
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="container-page py-10">{children}</main>
    </div>
  );
}
