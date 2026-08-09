import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/lib/constants";
import { getSiteContent } from "@/lib/data";
import { splitLines, splitParagraphs } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description:
    `${BUSINESS.name} is an independent mechanic in Sunshine North, serving Melbourne's western suburbs with honest advice and no surprise charges on every job.`,
};

export default async function AboutPage() {
  const content = await getSiteContent();

  return (
    <>
      <section className="bg-asphalt-800 py-16 text-cream-100">
        <div className="container-page">
          <span className="eyebrow-on-dark">{content("about.hero_eyebrow")}</span>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
            {content("about.hero_heading")}
          </h1>
        </div>
      </section>

      <section className="bg-cream-200 py-16">
        <div className="container-page grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-semibold uppercase text-asphalt-800">
              {content("about.approach_heading")}
            </h2>
            <div className="prose-none mt-4 space-y-4 text-sm leading-relaxed text-steel-500">
              {splitParagraphs(content("about.approach_body")).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            <h2 className="mt-10 font-display text-2xl font-semibold uppercase text-asphalt-800">
              {content("about.work_on_heading")}
            </h2>
            <ul className="mt-4 grid gap-2 text-sm text-steel-500 sm:grid-cols-2">
              {splitLines(content("about.work_on_items")).map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 bg-pit-500" />
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
              className="mt-4 block font-mono text-sm font-semibold text-steel-600 hover:text-pit-600"
            >
              {BUSINESS.phone}
            </a>
            <Link href="/book" className="btn-dark mt-6 w-full">
              Book an Appointment
            </Link>
            <Link href="/contact" className="btn-secondary mt-3 w-full !border-steel-400/40 !text-asphalt-800 hover:!border-pit-500 hover:!text-pit-600">
              Get in Touch
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
