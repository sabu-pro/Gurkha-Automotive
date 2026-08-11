import Image from "next/image";
import Link from "next/link";
import { BUSINESS, OPENING_HOURS, formatOpeningHoursRange } from "@/lib/constants";
import Reveal from "@/components/Reveal";

export default function Footer() {
  return (
    <footer className="bg-asphalt-900 text-cream-100">
      <Reveal className="container-page grid gap-10 py-14 md:grid-cols-3">
        <div>
          <Image
            src="/logo.png"
            alt={BUSINESS.name}
            width={127}
            height={40}
            className="h-10 w-auto transition-transform duration-300 ease-premium hover:scale-105"
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream-100/60">
            Straightforward vehicle servicing and repairs for Sunshine North and the
            surrounding western suburbs.
          </p>
        </div>

        <div>
          <h3 className="eyebrow-on-dark">Contact</h3>
          <ul className="mt-4 space-y-2 text-sm text-cream-100/75">
            <li>{BUSINESS.addressLine1}</li>
            <li>{BUSINESS.addressLine2}</li>
            <li>
              <a href={BUSINESS.phoneHref} className="hover:text-pit-400">
                {BUSINESS.phone}
              </a>
            </li>
            <li>
              <a href={BUSINESS.emailHref} className="inline-flex items-center gap-1.5 hover:text-pit-400">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="h-4 w-4 shrink-0"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A1.75 1.75 0 0 1 4.75 5h14.5A1.75 1.75 0 0 1 21 6.75v10.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25V6.75Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 7 8.5 6 8.5-6" />
                </svg>
                {BUSINESS.email}
              </a>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/book" className="btn-primary">
              Book Appointment
            </Link>
            <a
              href={BUSINESS.facebookUrl}
              target="_blank"
              rel="noopener"
              aria-label="Follow us on Facebook"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-cream-100/25 text-cream-100/70 transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-pit-400 hover:text-pit-400 active:translate-y-0 motion-reduce:hover:translate-y-0"
            >
              <svg aria-hidden="true" viewBox="0 0 320 512" fill="currentColor" className="h-5 w-5">
                <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
              </svg>
            </a>
            <Link href="/admin/login" className="text-xs font-semibold uppercase tracking-wide text-cream-100/40 hover:text-cream-100/70 self-center">
              Admin
            </Link>
            <a
              href={BUSINESS.googleBusinessUrl}
              target="_blank"
              rel="noopener"
              className="text-xs font-semibold uppercase tracking-wide text-cream-100/40 hover:text-cream-100/70 self-center"
            >
              Find us on Google
            </a>
          </div>
        </div>

        <div>
          <h3 className="eyebrow-on-dark">Opening Hours</h3>
          <ul className="mt-4 space-y-1.5 text-sm text-cream-100/75">
            {OPENING_HOURS.map((h) => (
              <li key={h.day} className="flex justify-between gap-6">
                <span>{h.day}</span>
                <span className="font-mono">{formatOpeningHoursRange(h)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <div className="border-t border-asphalt-600 py-6">
        <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-cream-100/40 sm:flex-row">
          <p>© {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-cream-100/70">
              Privacy
            </Link>
            <p>{BUSINESS.addressLine1}, {BUSINESS.addressLine2}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
