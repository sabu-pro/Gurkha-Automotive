import Image from "next/image";
import Link from "next/link";
import { BUSINESS } from "@/lib/constants";
import { getActiveServices } from "@/lib/data";
import ServiceCard from "@/components/ServiceCard";
import Reveal from "@/components/Reveal";

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

const TESTIMONIALS = [
  {
    quote:
      "I had a fabulous experience with the Gurkha Automotive team ! I really appreciated their warm welcome, polite communication, and professional work ethics. I took my car in for tyre maintenance and was incredibly impressed by their honesty and professionalism. They explained everything clearly without any pushy upsell tactics. This is officially my go-to automotive repair shop in Melbourne",
    name: "Dhan Ghale",
  },
  {
    quote: "I had great experience at this enterprise. He had expert knowledge and fixed my van quick. The price is low and honest.",
    name: "Rajat",
  },
  {
    quote: "Taking great care with my vehicle. Very knowledgeable, honest and friendly.",
    name: "M W",
  },
];

export default async function HomePage() {
  const services = await getActiveServices();
  const featuredServices = services.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[60vh] items-center overflow-hidden bg-asphalt-800 text-cream-100 md:min-h-[70vh]">
        <Image
          src="/gurkha-mechanic-hero-16x9.jpg"
          alt="Gurkha Automotive mechanic servicing a vehicle in Sunshine North"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/55 to-black/35"
          aria-hidden="true"
        />
        <div className="container-page relative py-20">
          <div className="max-w-xl [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]">
            <span className="eyebrow-on-dark animate-fade-up inline-block rounded-sm bg-black/35 px-2 py-1 backdrop-blur-sm">
              Sunshine North, VIC
            </span>
            <h1 className="animate-fade-up mt-4 font-display text-4xl font-bold uppercase leading-[1.05] tracking-tight [animation-delay:100ms] sm:text-5xl">
              Honest mechanical
              <br />
              work, done right
              <span className="text-rust-500">.</span>
            </h1>
            <p className="animate-fade-up mt-6 max-w-md text-base leading-relaxed text-cream-100/80 [animation-delay:200ms]">
              {BUSINESS.name} services, inspects and repairs vehicles for the local
              community. Book your appointment online in a couple of minutes.
            </p>
            <div className="animate-fade-up mt-8 flex flex-wrap gap-4 [animation-delay:300ms]">
              <Link href="/book" className="btn-primary">
                Book an Appointment
              </Link>
              <a href={BUSINESS.phoneHref} className="btn-secondary">
                Call {BUSINESS.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="container-page">
          <Reveal>
            <span className="eyebrow">Why Gurkha Automotive</span>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold uppercase tracking-tight text-asphalt-800 sm:text-4xl">
              Reliable work, fair pricing
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <Reveal className="group relative aspect-[4/3] w-full overflow-hidden rounded-md shadow-panel">
              <Image
                src="/gurkha-4wd-workshop.jpg"
                alt="A 4WD parked outside the Gurkha Automotive workshop in Sunshine North"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-right transition-transform duration-300 ease-premium group-hover:scale-105"
              />
            </Reveal>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delayMs={i * 80}>
                  <div className="h-full border-t-4 border-pit-500 bg-white p-6 shadow-panel transition-all duration-300 ease-premium hover:-translate-y-1 hover:shadow-lg">
                    <h3 className="font-display text-lg font-semibold uppercase text-asphalt-800">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-steel-500">{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services preview */}
      {featuredServices.length > 0 && (
        <section className="bg-cream-300 py-20">
          <div className="container-page">
            <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="group relative hidden h-24 w-20 shrink-0 overflow-hidden rounded-md shadow-panel sm:block sm:h-28 sm:w-24">
                  <Image
                    src="/gurkha-engine-detail.jpg"
                    alt="Close-up of engine internals during a service at Gurkha Automotive"
                    fill
                    sizes="96px"
                    className="object-cover transition-transform duration-300 ease-premium group-hover:scale-105"
                  />
                </div>
                <div>
                  <span className="eyebrow">Popular Services</span>
                  <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-asphalt-800 sm:text-4xl">
                    What we can help with
                  </h2>
                </div>
              </div>
              <Link href="/services" className="btn-dark shrink-0">
                View All Services
              </Link>
            </Reveal>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredServices.map((service, i) => (
                <Reveal key={service.id} delayMs={i * 80}>
                  <ServiceCard service={service} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Visit our workshop */}
      <section className="bg-white py-16">
        <Reveal className="container-page flex flex-col gap-8 sm:flex-row sm:items-center">
          <div className="group relative h-48 w-full shrink-0 overflow-hidden rounded-md shadow-panel sm:h-56 sm:w-56">
            <Image
              src="/gurkha-workshop-exterior.jpg"
              alt="Gurkha Automotive workshop frontage with signage on Whitehill Ave, Sunshine North"
              fill
              sizes="(min-width: 640px) 224px, 100vw"
              className="object-cover object-center transition-transform duration-300 ease-premium group-hover:scale-105"
            />
          </div>
          <div>
            <span className="eyebrow">Visit Our Workshop</span>
            <p className="mt-3 font-display text-2xl font-bold uppercase tracking-tight text-asphalt-800">
              {BUSINESS.addressLine1}
            </p>
            <p className="mt-1 text-base text-steel-500">{BUSINESS.addressLine2}</p>
          </div>
        </Reveal>
      </section>

      {/* Testimonials */}
      <section className="bg-cream-200 py-20">
        <div className="container-page">
          <Reveal>
            <span className="eyebrow">What Our Customers Say</span>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold uppercase tracking-tight text-asphalt-800 sm:text-4xl">
              Trusted by drivers across Melbourne&apos;s west
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delayMs={i * 80}>
                <div className="flex h-full flex-col gap-4 border-t-4 border-pit-500 bg-white p-6 shadow-panel transition-all duration-300 ease-premium hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex gap-0.5 text-amber-500" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <svg key={starIndex} viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9-4.3-4.2 5.9-.8L10 1.5z" />
                      </svg>
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-steel-500">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="font-display text-sm font-semibold uppercase tracking-wide text-asphalt-800">
                      {t.name}
                    </p>
                    <p className="text-xs text-steel-400">Google review</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 text-center text-sm font-semibold text-steel-500">
            <a
              href={BUSINESS.googleBusinessUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 hover:text-pit-600"
            >
              See our reviews on Google
              <span className="text-amber-500" aria-hidden="true">★</span>
            </a>
          </p>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-asphalt-800">
        <Reveal className="container-page flex flex-col items-center justify-between gap-6 py-12 text-center md:flex-row md:text-left">
          <div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
              Ready to book your vehicle in?
            </h2>
            <p className="mt-1 text-sm font-medium text-cream-100/70">
              Pick a service and time that works for you — takes about two minutes.
            </p>
          </div>
          <Link href="/book" className="btn-primary shrink-0">
            Book Appointment
          </Link>
        </Reveal>
      </section>
    </>
  );
}
