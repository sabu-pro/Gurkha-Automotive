"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import SignOutButton from "@/components/admin/SignOutButton";

const ADMIN_LINKS = [
  { href: "/admin/dashboard", label: "Bookings" },
  { href: "/admin/dashboard/services", label: "Manage Services" },
  { href: "/admin/dashboard/content", label: "Page Content" },
];

/** Every item in the phone menu gets the same shape, so nothing reads as an odd one out. */
const MOBILE_ITEM =
  "flex min-h-[48px] w-full items-center rounded-sm px-3 text-sm font-bold uppercase tracking-wide transition-colors";

export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const onBookings = pathname === "/admin/dashboard";
  const onServices = pathname?.startsWith("/admin/dashboard/services") ?? false;
  const onContent = pathname?.startsWith("/admin/dashboard/content") ?? false;

  // Bookings is the dashboard index, so it only matches exactly; the others
  // own a subtree.
  const isCurrent = (href: string) =>
    href === "/admin/dashboard" ? onBookings : pathname?.startsWith(href) ?? false;

  // Navigating keeps this component mounted, so close the menu ourselves.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* Desktop / tablet — unchanged from the original inline row. */}
      <nav className="hidden items-center gap-1.5 sm:flex sm:gap-3">
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

      {/* Phones — one hamburger instead of four competing controls. */}
      <button
        type="button"
        aria-label={open ? "Close admin menu" : "Open admin menu"}
        aria-expanded={open}
        aria-controls="admin-mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-cream-100/25 text-cream-100 transition-colors hover:border-pit-400 hover:text-pit-400 sm:hidden"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        // Anchored to the sticky header rather than sitting in its flow, so
        // opening the menu doesn't change the header's height.
        <div
          id="admin-mobile-menu"
          className="absolute inset-x-0 top-full border-b border-asphalt-600 bg-asphalt-900 shadow-lg shadow-black/30 sm:hidden"
        >
          <nav className="container-admin flex flex-col gap-1 py-3">
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isCurrent(link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  MOBILE_ITEM,
                  isCurrent(link.href)
                    ? "bg-pit-500 text-white"
                    : "text-cream-100/70 hover:bg-cream-100/5 hover:text-cream-100"
                )}
              >
                {link.label}
              </Link>
            ))}

            <span className="my-1 h-px w-full bg-cream-100/10" aria-hidden="true" />

            <SignOutButton
              className={cn(
                MOBILE_ITEM,
                "text-cream-100/70 hover:bg-cream-100/5 hover:text-cream-100 disabled:opacity-50"
              )}
            />
          </nav>
        </div>
      )}
    </>
  );
}
