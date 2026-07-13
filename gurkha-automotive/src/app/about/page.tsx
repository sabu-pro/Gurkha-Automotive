import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description: `About ${BUSINESS.name}, a local automotive workshop in Sunshine North, VIC.`,
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-asphalt-800 py-16 text-cream-100">
        <div className="container-page">
          <span className="eyebrow">About Us</span>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
            {BUSINESS.name}
          </h1>
        </div>
      </section>

      <section className="bg-cream-200 py-16">
        <div className="container-page grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-semibold uppercase text-asphalt-800">
              Our Approach
            </h2>
            <div className="prose-none mt-4 space-y-4 text-sm leading-relaxed text-steel-500">
              <p>
                {BUSINESS.name} is an independent automotive workshop based in Sunshine
                North, servicing the local community and surrounding western suburbs of
                Melbourne. We work on a wide range of makes and models, from routine
                servicing through to inspections, brakes, tyres and diagnostics.
              </p>
              <p>
                We believe in explaining what a vehicle actually needs, in plain
                language, before any work begins — and getting the owner&apos;s sign-off on
                anything beyond the original job.
              </p>
              <p className="rounded-sm border border-dashed border-steel-400/50 bg-white p-4 text-steel-500">
                <strong className="text-asphalt-800">Content placeholder:</strong> add the
                workshop&apos;s history, the team&apos;s background and qualifications, and any
                accreditations here once supplied by the business.
              </p>
            </div>

            <h2 className="mt-10 font-display text-2xl font-semibold uppercase text-asphalt-800">
              What We Work On
            </h2>
            <ul className="mt-4 grid gap-2 text-sm text-steel-500 sm:grid-cols-2">
              {[
                "Passenger cars",
                "SUVs & 4WDs",
                "Light commercial vehicles",
                "Petrol & diesel engines",
                "Logbook servicing",
                "Pre-purchase inspections",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 bg-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <aside className="card-panel h-fit p-6">
            <h3 className="eyebrow">Visit Us</h3>
            <p className="mt-3 text-sm font-semibold text-asphalt-800">
              {BUSINESS.addressLine1}
              <br />
              {BUSINESS.addressLine2}
            </p>
            <a
              href={BUSINESS.phoneHref}
              className="mt-4 block font-mono text-sm font-semibold text-steel-600 hover:text-amber-600"
            >
              {BUSINESS.phone}
            </a>
            <Link href="/book" className="btn-dark mt-6 w-full">
              Book an Appointment
            </Link>
            <Link href="/contact" className="btn-secondary mt-3 w-full !border-steel-400/40 !text-asphalt-800 hover:!border-amber-500 hover:!text-amber-600">
              Get in Touch
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
