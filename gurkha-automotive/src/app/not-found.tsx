import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-cream-200 py-20">
      <div className="container-page text-center">
        <span className="eyebrow">404</span>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-asphalt-800">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-steel-500">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link href="/" className="btn-dark mt-8 inline-flex">
          Back to Home
        </Link>
      </div>
    </section>
  );
}
