import Image from "next/image";
import Link from "next/link";
import { BUSINESS, OPENING_HOURS, formatOpeningHoursRange } from "@/lib/constants";
import Reveal from "@/components/Reveal";

/*
  Shared by every social button so the row stays identical in size, border
  and hover — the icons inside carry their own brand colours, so the hover
  works on the frame rather than on the fill.
*/
const SOCIAL_LINK =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-cream-100/25 transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-cream-100/45 hover:bg-cream-100/5 active:translate-y-0 motion-reduce:hover:translate-y-0";

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

          <h3 className="eyebrow-on-dark mt-8">Follow Us</h3>
          <div className="mt-4 flex items-center gap-3">
            <a
              href={BUSINESS.facebookUrl}
              target="_blank"
              rel="noopener"
              aria-label="Follow us on Facebook"
              className={SOCIAL_LINK}
            >
              <svg aria-hidden="true" viewBox="0 0 320 512" fill="#1877F2" className="h-5 w-5">
                <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
              </svg>
            </a>

            <a
              href={BUSINESS.googleBusinessUrl}
              target="_blank"
              rel="noopener"
              aria-label="Find us on Google"
              className={SOCIAL_LINK}
            >
              {/* Sized a touch smaller than the Facebook "f" so the two marks read as equal weight. */}
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
                />
              </svg>
            </a>
          </div>
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
            <Link href="/admin/login" className="text-xs font-semibold uppercase tracking-wide text-cream-100/40 hover:text-cream-100/70 self-center">
              Admin
            </Link>
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
