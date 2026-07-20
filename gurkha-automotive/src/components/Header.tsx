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
            className="h-14 w-auto sm:h-[72px]"
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

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={BUSINESS.phoneHref}
            className="inline-flex items-center gap-2 rounded-sm border border-asphalt-800/15 px-5 py-3 text-sm font-bold uppercase tracking-wide text-asphalt-800 transition-colors hover:border-pit-500 hover:text-pit-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1.1l-2.3 2.1z" />
            </svg>
            Call Us
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
            <a
              href={BUSINESS.phoneHref}
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-sm border border-asphalt-800/15 px-2 py-2.5 text-sm font-bold uppercase tracking-wide text-asphalt-800"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1.1l-2.3 2.1z" />
              </svg>
              Call Us
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
