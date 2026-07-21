import Link from "next/link";
import { formatCurrencyFromCents } from "@/lib/utils";
import type { Service } from "@/lib/types";

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="card-panel group relative flex h-full flex-col overflow-hidden p-6 hover:-translate-y-1 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-pit-500 transition-transform duration-300 ease-premium group-hover:scale-x-100" />
      <h3 className="font-display text-xl font-semibold uppercase tracking-wide text-asphalt-800">
        {service.name}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-steel-500">
        {service.description ?? "Ask us for details when you book."}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-cream-300 pt-4">
        <span className="font-mono text-sm font-semibold text-steel-600">
          ~{service.duration_minutes} min
        </span>
        <span className="text-sm font-bold text-asphalt-800">
          {formatCurrencyFromCents(service.price_from_cents)}
        </span>
      </div>
      <Link
        href={`/book?service=${service.id}`}
        className="btn-dark mt-4 w-full"
      >
        Book This Service
      </Link>
    </div>
  );
}
