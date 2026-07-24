import Image from "next/image";
import Link from "next/link";
import { BUSINESS } from "@/lib/constants";
import SignOutButton from "@/components/admin/SignOutButton";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-200">
      <header className="border-b border-asphalt-600 bg-asphalt-800">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt={BUSINESS.name}
              width={114}
              height={36}
              priority
              className="h-9 w-auto"
            />
            <span className="font-display text-base font-semibold uppercase tracking-wide text-cream-100">
              <span className="text-cream-100/50">Admin</span>
            </span>
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="container-page py-10">{children}</main>
    </div>
  );
}
