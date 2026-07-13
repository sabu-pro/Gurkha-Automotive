import Link from "next/link";
import { BUSINESS, OPENING_HOURS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-asphalt-900 text-cream-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-sm bg-amber-500 font-display text-lg font-bold text-asphalt-900">
              GA
            </span>
            <span className="font-display text-lg font-semibold uppercase tracking-wide">
              {BUSINESS.name}
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream-100/60">
            Straightforward vehicle servicing and repairs for Sunshine North and the
            surrounding western suburbs.
          </p>
        </div>

        <div>
          <h3 className="eyebrow">Contact</h3>
          <ul className="mt-4 space-y-2 text-sm text-cream-100/75">
            <li>{BUSINESS.addressLine1}</li>
            <li>{BUSINESS.addressLine2}</li>
            <li>
              <a href={BUSINESS.phoneHref} className="hover:text-amber-400">
                {BUSINESS.phone}
              </a>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/book" className="btn-primary">
              Book Appointment
            </Link>
            <Link href="/admin/login" className="text-xs font-semibold uppercase tracking-wide text-cream-100/40 hover:text-cream-100/70 self-center">
              Admin
            </Link>
          </div>
        </div>

        <div>
          <h3 className="eyebrow">Opening Hours</h3>
          <ul className="mt-4 space-y-1.5 text-sm text-cream-100/75">
            {OPENING_HOURS.map((h) => (
              <li key={h.day} className="flex justify-between gap-6">
                <span>{h.day}</span>
                <span className="font-mono">
                  {h.open && h.close ? `${to12h(h.open)} – ${to12h(h.close)}` : "Closed"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-asphalt-600 py-6">
        <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-cream-100/40 sm:flex-row">
          <p>© {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.</p>
          <p>{BUSINESS.addressLine1}, {BUSINESS.addressLine2}</p>
        </div>
      </div>
    </footer>
  );
}

function to12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${m ? ":" + String(m).padStart(2, "0") : ""} ${period}`;
}
