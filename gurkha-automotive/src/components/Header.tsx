"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BUSINESS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-cream-300 bg-white/95 backdrop-blur">
      <div className="container-page flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
          <Image
            src="/logo.png"
            alt={BUSINESS.name}
            width={725}
            height={229}
            priority
            className="h-11 w-auto sm:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "border-b-2 pb-1 text-sm font-semibold uppercase tracking-wide transition-colors hover:text-pit-600",
                pathname === link.href
                  ? "border-pit-500 text-asphalt-800"
                  : "border-transparent text-steel-500"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <a
            href={BUSINESS.phoneHref}
            className="font-mono text-sm font-semibold text-steel-600 hover:text-pit-600"
          >
            {BUSINESS.phone}
          </a>
          <Link href="/book" className="btn-primary">
            Book Now
          </Link>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center text-asphalt-800 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="border-t border-cream-300 bg-white md:hidden">
          <nav className="container-page flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-sm px-2 py-2.5 text-sm font-semibold uppercase tracking-wide",
                  pathname === link.href ? "text-pit-600" : "text-steel-600"
                )}
              >
                {link.label}
              </Link>
            ))}
            <a href={BUSINESS.phoneHref} className="px-2 py-2.5 font-mono text-sm text-steel-600">
              {BUSINESS.phone}
            </a>
            <Link href="/book" className="btn-primary mt-2" onClick={() => setOpen(false)}>
              Book Now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
