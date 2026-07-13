import type { Metadata } from "next";
import { BUSINESS, OPENING_HOURS } from "@/lib/constants";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${BUSINESS.name} in Sunshine North, VIC.`,
};

export default function ContactPage() {
  const mapQuery = encodeURIComponent(BUSINESS.fullAddress);

  return (
    <>
      <section className="bg-asphalt-800 py-16 text-cream-100">
        <div className="container-page">
          <span className="eyebrow">Get In Touch</span>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
            Contact Us
          </h1>
        </div>
      </section>

      <section className="bg-cream-200 py-16">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="card-panel p-6">
              <h2 className="font-display text-lg font-semibold uppercase text-asphalt-800">
                Workshop Details
              </h2>
              <dl className="mt-4 space-y-3 text-sm text-steel-500">
                <div>
                  <dt className="font-bold text-asphalt-800">Address</dt>
                  <dd>{BUSINESS.addressLine1}, {BUSINESS.addressLine2}</dd>
                </div>
                <div>
                  <dt className="font-bold text-asphalt-800">Phone</dt>
                  <dd>
                    <a href={BUSINESS.phoneHref} className="hover:text-amber-600">
                      {BUSINESS.phone}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card-panel p-6">
              <h2 className="font-display text-lg font-semibold uppercase text-asphalt-800">
                Opening Hours
              </h2>
              <ul className="mt-4 space-y-1.5 text-sm text-steel-500">
                {OPENING_HOURS.map((h) => (
                  <li key={h.day} className="flex justify-between border-b border-cream-300 pb-1.5 last:border-none">
                    <span className="font-semibold text-asphalt-800">{h.day}</span>
                    <span className="font-mono">
                      {h.open && h.close ? `${h.open} – ${h.close}` : "Closed"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-panel overflow-hidden">
              <iframe
                title="Map to Gurkha Automotive"
                width="100%"
                height="260"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                className="block"
              />
            </div>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold uppercase text-asphalt-800">
              Send an Enquiry
            </h2>
            <p className="mt-2 text-sm text-steel-500">
              For appointments, use the booking page — it&apos;s faster. For everything else,
              send us a message and we&apos;ll reply by email.
            </p>
            <div className="mt-4">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
