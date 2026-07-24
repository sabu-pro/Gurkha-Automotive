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
            width={725}
            height={229}
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
              <a href={BUSINESS.emailHref} className="hover:text-pit-400">
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
          <p>{BUSINESS.addressLine1}, {BUSINESS.addressLine2}</p>
        </div>
      </div>
    </footer>
  );
}
