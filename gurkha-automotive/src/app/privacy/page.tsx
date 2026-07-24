import type { Metadata } from "next";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${BUSINESS.name} collects, uses and protects your information.`,
};

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-asphalt-800 py-16 text-cream-100">
        <div className="container-page">
          <span className="eyebrow-on-dark">Privacy</span>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
        </div>
      </section>

      <section className="bg-cream-200 py-16">
        <div className="container-page max-w-3xl">
          <div className="space-y-10 text-sm leading-relaxed text-steel-500">
            <p>
              {BUSINESS.name} is a small, independently owned automotive workshop in Sunshine
              North, VIC. This page explains, in plain language, what information we collect
              through this website and our booking and enquiry forms, and how we use it.
            </p>

            <div>
              <h2 className="font-display text-xl font-semibold uppercase text-asphalt-800">
                What We Collect
              </h2>
              <p className="mt-3">
                When you make a booking or send us an enquiry, we collect the details you give
                us directly, which may include:
              </p>
              <ul className="mt-3 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-pit-500" />
                  Your name, email address and phone number
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-pit-500" />
                  Your vehicle&apos;s registration, make and model
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-pit-500" />
                  Any notes or messages you choose to include about your booking or enquiry
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-xl font-semibold uppercase text-asphalt-800">
                How We Use Your Information
              </h2>
              <p className="mt-3">
                We use this information only to manage your booking, carry out the requested
                service, and contact you about your vehicle or appointment — for example, to
                confirm a booking, ask a question about the work, or let you know your vehicle
                is ready.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-semibold uppercase text-asphalt-800">
                Sharing Your Information
              </h2>
              <p className="mt-3">
                We don&apos;t sell or share your information with third parties. Your details
                are used solely by {BUSINESS.name} to provide our services to you.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-semibold uppercase text-asphalt-800">
                Contact Us
              </h2>
              <p className="mt-3">
                If you have any questions about this policy or the information we hold about
                you, get in touch at{" "}
                <a href={BUSINESS.emailHref} className="font-semibold text-asphalt-800 hover:text-pit-600">
                  {BUSINESS.email}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
