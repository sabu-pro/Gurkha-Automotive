import Link from "next/link";
import { BUSINESS, OPENING_HOURS } from "@/lib/constants";
import { getActiveServices } from "@/lib/data";
import ServiceCard from "@/components/ServiceCard";

const FEATURES = [
  {
    title: "Straight Answers",
    body: "We explain what your vehicle needs in plain language before any work starts — no surprise charges.",
  },
  {
    title: "Local & Independent",
    body: "A local Sunshine North workshop, not a franchise call centre. You deal directly with the people doing the work.",
  },
  {
    title: "All Makes & Models",
    body: "From daily runabouts to family SUVs, our techs work across a wide range of makes and models.",
  },
  {
    title: "Book Online, Anytime",
    body: "Pick a service, choose a time that suits you, and get instant confirmation by email.",
  },
];

export default async function HomePage() {
  const services = await getActiveServices();
  const featuredServices = services.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-asphalt-800 text-cream-100">
        <div
          className="pointer-events-none absolute inset-0 bg-grille opacity-40"
          aria-hidden="true"
        />
        <div className="container-page relative grid gap-12 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <span className="eyebrow">Sunshine North, VIC</span>
            <h1 className="mt-4 font-display text-4xl font-bold uppercase leading-[1.05] tracking-tight sm:text-5xl">
              Honest mechanical
              <br />
              work, done right
              <span className="text-amber-500">.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-cream-100/70">
              {BUSINESS.name} services, inspects and repairs vehicles for the local
              community. Book your appointment online in a couple of minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/book" className="btn-primary">
                Book an Appointment
              </Link>
              <a href={BUSINESS.phoneHref} className="btn-secondary">
                Call {BUSINESS.phone}
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="hazard-divider mb-0" />
            <div className="card-panel !rounded-none !border-0 bg-asphalt-700 p-8">
              <span className="eyebrow">Workshop Hours</span>
              <ul className="mt-4 space-y-2">
                {OPENING_HOURS.map((h) => (
                  <li
                    key={h.day}
                    className="flex items-center justify-between border-b border-cream-100/10 pb-2 text-sm text-cream-100/80 last:border-none"
                  >
                    <span className="font-semibold">{h.day}</span>
                    <span className="font-mono">
                      {h.open && h.close ? `${h.open} – ${h.close}` : "Closed"}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-cream-100/10 pt-6 text-sm text-cream-100/70">
                <p className="font-semibold text-cream-100">{BUSINESS.addressLine1}</p>
                <p>{BUSINESS.addressLine2}</p>
              </div>
            </div>
            <div className="hazard-divider mt-0" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-cream-200 py-20">
        <div className="container-page">
          <span className="eyebrow">Why Gurkha Automotive</span>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-bold uppercase tracking-tight text-asphalt-800 sm:text-4xl">
            Reliable work, fair pricing
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="border-t-4 border-amber-500 bg-white p-6 shadow-panel">
                <h3 className="font-display text-lg font-semibold uppercase text-asphalt-800">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services preview */}
      {featuredServices.length > 0 && (
        <section className="bg-asphalt-900 py-20">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Popular Services</span>
                <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-cream-100 sm:text-4xl">
                  What we can help with
                </h2>
              </div>
              <Link href="/services" className="btn-secondary">
                View All Services
              </Link>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA banner */}
      <section className="bg-amber-500">
        <div className="container-page flex flex-col items-center justify-between gap-6 py-12 text-center md:flex-row md:text-left">
          <div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-asphalt-900 sm:text-3xl">
              Ready to book your vehicle in?
            </h2>
            <p className="mt-1 text-sm font-medium text-asphalt-800/80">
              Pick a service and time that works for you — takes about two minutes.
            </p>
          </div>
          <Link href="/book" className="btn-dark shrink-0">
            Book Appointment
          </Link>
        </div>
      </section>
    </>
  );
}
