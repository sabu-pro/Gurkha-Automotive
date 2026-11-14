import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BUSINESS } from "@/lib/constants";
import { getAdminSession } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";
import SignOutButton from "@/components/admin/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // The middleware only checks that someone is signed in. Admin access
  // additionally requires a row in public.admin_users — checked here for
  // every dashboard page, and again by RLS on every query.
  const session = await getAdminSession();
  if (!session.ok && session.reason === "unauthenticated") redirect("/admin/login");

  return (
    <div className="min-h-screen bg-cream-200">
      {/*
        The only header on admin pages — the public site header is
        hidden for /admin/* by SiteChrome in the root layout.
      */}
      <header className="sticky top-0 z-50 border-b border-asphalt-600 bg-asphalt-900">
        <div className="container-admin flex h-16 items-center justify-between gap-4">
          <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo.png"
              alt={BUSINESS.name}
              width={228}
              height={72}
              priority
              className="h-9 w-auto shrink-0"
            />
            {/* The phone menu freed up the header row, so the wordmark fits there too. */}
            <span className="h-6 w-px bg-cream-100/20" aria-hidden="true" />
            <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-cream-100/50">
              Admin
            </span>
          </Link>

          {session.ok ? <AdminNav /> : <SignOutButton />}
        </div>
      </header>

      <main className="container-admin py-8 sm:py-10">
        {session.ok ? (
          children
        ) : (
          <div className="card-panel mx-auto max-w-lg p-8 text-center">
            <h1 className="font-display text-2xl font-bold uppercase text-asphalt-800">No admin access</h1>
            <p className="mt-3 text-sm leading-relaxed text-steel-500">
              You&apos;re signed in, but this account hasn&apos;t been given access to the admin dashboard.
              Ask the workshop owner to add you, then sign in again.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
