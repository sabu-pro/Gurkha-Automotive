import type { Metadata } from "next";
import Link from "next/link";
import { getActiveServices, getSiteContent } from "@/lib/data";
import ServiceCard from "@/components/ServiceCard";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Mechanic services in Sunshine North: logbook service, roadworthy inspections, brakes, tyres, batteries and diagnostics for Melbourne's western suburbs.",
};

export const revalidate = 60;

export default async function ServicesPage() {
  const [services, content] = await Promise.all([getActiveServices(), getSiteContent()]);

  return (
    <>
      <section className="bg-asphalt-800 py-16 text-cream-100">
        <div className="container-page">
          <span className="eyebrow-on-dark">{content("services.hero_eyebrow")}</span>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
            {content("services.hero_heading")}
          </h1>
          <p className="mt-4 max-w-xl text-cream-100/70">
            {content("services.hero_subtext")}
          </p>
        </div>
      </section>

      <section className="bg-cream-200 py-16">
        <div className="container-page">
          {services.length === 0 ? (
            <div className="card-panel p-10 text-center">
              <p className="text-steel-500">{content("services.empty_message")}</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}

          <div className="mt-14 card-panel flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h2 className="font-display text-xl font-semibold uppercase text-asphalt-800">
                {content("services.cta_heading")}
              </h2>
              <p className="mt-1 text-sm text-steel-500">{content("services.cta_subtext")}</p>
            </div>
            <Link href="/book" className="btn-dark shrink-0">
              Book Appointment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
