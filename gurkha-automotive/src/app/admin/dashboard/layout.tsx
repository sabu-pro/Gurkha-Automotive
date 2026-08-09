import Image from "next/image";
import Link from "next/link";
import { BUSINESS } from "@/lib/constants";
import AdminNav from "@/components/admin/AdminNav";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-200">
      {/*
        The only header on admin pages — the public site header is
        hidden for /admin/* by SiteChrome in the root layout.
      */}
      <header className="sticky top-0 z-50 border-b border-asphalt-600 bg-asphalt-900">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo.png"
              alt={BUSINESS.name}
              width={228}
              height={72}
              priority
              className="h-9 w-auto shrink-0"
            />
            <span className="hidden h-6 w-px bg-cream-100/20 sm:block" aria-hidden="true" />
            <span className="hidden font-display text-sm font-semibold uppercase tracking-[0.2em] text-cream-100/50 sm:block">
              Admin
            </span>
          </Link>

          <AdminNav />
        </div>
      </header>

      <main className="container-page py-10">{children}</main>
    </div>
  );
}
