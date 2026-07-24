import type { Metadata } from "next";
import { Suspense } from "react";
import { getActiveServices } from "@/lib/data";
import BookingForm from "@/components/BookingForm";
import BookingFormSkeleton from "@/components/BookingFormSkeleton";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Book Appointment",
  description: `Book your vehicle service or repair online at ${BUSINESS.name}.`,
};

export default async function BookPage() {
  const services = await getActiveServices();

  return (
    <>
      <section className="bg-asphalt-800 py-16 text-cream-100">
        <div className="container-page">
          <span className="eyebrow-on-dark">Book Online</span>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
            Book Your Appointment
          </h1>
          <p className="mt-4 max-w-xl text-cream-100/70">
            Choose a service, pick a date and time, and tell us about your vehicle.
            You&apos;ll get an email as soon as we&apos;ve received it.
          </p>
        </div>
      </section>

      <section className="bg-cream-200 py-16">
        <div className="container-page max-w-4xl">
          <Suspense fallback={<BookingFormSkeleton />}>
            <BookingForm services={services} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
