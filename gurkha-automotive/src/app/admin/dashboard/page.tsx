import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import BookingsDashboard from "@/components/admin/BookingsDashboard";
import { todayIsoDate } from "@/lib/utils";
import type { Booking, Service } from "@/lib/types";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("*, service:services(*)")
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true });

  const bookings = (data ?? []) as unknown as (Booking & { service: Service })[];

  const today = todayIsoDate();
  const stats = {
    today: bookings.filter((b) => b.booking_date === today && b.status !== "cancelled").length,
    upcoming: bookings.filter((b) => b.booking_date > today && (b.status === "pending" || b.status === "confirmed")).length,
    pending: bookings.filter((b) => b.status === "pending").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-asphalt-800">
            Bookings
          </h1>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Today" value={stats.today} />
        <StatCard label="Upcoming" value={stats.upcoming} />
        <StatCard label="Pending" value={stats.pending} accent="amber" />
        <StatCard label="Completed" value={stats.completed} accent="pit" />
        <StatCard label="Cancelled" value={stats.cancelled} accent="rust" />
      </div>

      {error ? (
        <div className="card-panel p-8 text-center text-sm text-rust-600">
          Could not load bookings: {error.message}
        </div>
      ) : (
        <BookingsDashboard initialBookings={bookings} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "pit" | "rust";
}) {
  const border =
    accent === "amber"
      ? "border-t-amber-500"
      : accent === "pit"
      ? "border-t-pit"
      : accent === "rust"
      ? "border-t-rust"
      : "border-t-steel-500";

  return (
    <div className={`card-panel border-t-4 ${border} p-4`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-steel-400">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-asphalt-800">{value}</p>
    </div>
  );
}
