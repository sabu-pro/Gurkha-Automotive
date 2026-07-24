export default function BookingFormSkeleton() {
  return (
    <div role="status" aria-label="Loading booking form" className="space-y-10">
      <span className="sr-only">Loading booking form…</span>

      <div aria-hidden="true" className="animate-pulse space-y-10">
        {/* Step 1: Choose a service */}
        <div>
          <div className="h-5 w-48 rounded-sm bg-cream-300" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-sm border border-cream-300 bg-white p-4">
                <div className="h-4 w-3/4 rounded-sm bg-cream-300" />
                <div className="mt-2 h-3 w-1/3 rounded-sm bg-cream-300" />
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Choose date & time */}
        <div>
          <div className="h-5 w-56 rounded-sm bg-cream-300" />
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="card-panel p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3">
                <div className="h-8 w-8 rounded-sm bg-cream-300" />
                <div className="h-4 w-32 rounded-sm bg-cream-300" />
                <div className="h-8 w-8 rounded-sm bg-cream-300" />
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={`wd-${i}`} className="mx-auto my-1 h-3 w-4 rounded-sm bg-cream-300" />
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={`day-${i}`} className="aspect-square rounded-sm bg-cream-300" />
                ))}
              </div>
            </div>

            <div className="card-panel p-5">
              <div className="mb-3 h-3 w-40 rounded-sm bg-cream-300" />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-sm bg-cream-300" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Your details */}
        <div>
          <div className="h-5 w-32 rounded-sm bg-cream-300" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="h-3 w-20 rounded-sm bg-cream-300" />
              <div className="mt-1.5 h-[42px] rounded-sm bg-cream-300" />
            </div>
            <div>
              <div className="h-3 w-14 rounded-sm bg-cream-300" />
              <div className="mt-1.5 h-[42px] rounded-sm bg-cream-300" />
            </div>
            <div className="sm:col-span-2">
              <div className="h-3 w-16 rounded-sm bg-cream-300" />
              <div className="mt-1.5 h-[42px] rounded-sm bg-cream-300" />
            </div>
            <div>
              <div className="h-3 w-32 rounded-sm bg-cream-300" />
              <div className="mt-1.5 h-[42px] rounded-sm bg-cream-300" />
            </div>
            <div>
              <div className="h-3 w-24 rounded-sm bg-cream-300" />
              <div className="mt-1.5 h-[42px] rounded-sm bg-cream-300" />
            </div>
            <div>
              <div className="h-3 w-28 rounded-sm bg-cream-300" />
              <div className="mt-1.5 h-[42px] rounded-sm bg-cream-300" />
            </div>
            <div className="sm:col-span-2">
              <div className="h-3 w-28 rounded-sm bg-cream-300" />
              <div className="mt-1.5 h-24 rounded-sm bg-cream-300" />
            </div>
          </div>
        </div>

        <div className="h-3 w-full max-w-md rounded-sm bg-cream-300" />
        <div className="h-11 w-48 rounded-sm bg-cream-300" />
      </div>
    </div>
  );
}
