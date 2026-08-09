"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import SignOutButton from "@/components/admin/SignOutButton";

export default function AdminNav() {
  const pathname = usePathname();
  const onBookings = pathname === "/admin/dashboard";
  const onServices = pathname?.startsWith("/admin/dashboard/services") ?? false;
  const onContent = pathname?.startsWith("/admin/dashboard/content") ?? false;

  return (
    <nav className="flex items-center gap-1.5 sm:gap-3">
      <Link
        href="/admin/dashboard"
        aria-current={onBookings ? "page" : undefined}
        className={cn(
          "rounded-sm px-2.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors sm:px-3",
          onBookings ? "text-cream-100" : "text-cream-100/60 hover:text-cream-100"
        )}
      >
        Bookings
      </Link>

      <Link
        href="/admin/dashboard/services"
        aria-current={onServices ? "page" : undefined}
        className={cn("btn-primary !px-4 !py-2 !text-xs", onServices && "!bg-pit-600")}
      >
        Manage Services
      </Link>

      <Link
        href="/admin/dashboard/content"
        aria-current={onContent ? "page" : undefined}
        className={cn("btn-primary !px-4 !py-2 !text-xs", onContent && "!bg-pit-600")}
      >
        Page Content
      </Link>

      <span className="mx-1 hidden h-5 w-px bg-cream-100/15 sm:block" aria-hidden="true" />

      <SignOutButton />
    </nav>
  );
}
