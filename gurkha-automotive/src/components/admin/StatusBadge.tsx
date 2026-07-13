import { statusLabel } from "@/lib/utils";
import type { BookingStatus } from "@/lib/types";

const STYLES: Record<BookingStatus, string> = {
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/40",
  confirmed: "bg-steel-500/10 text-steel-600 border-steel-500/30",
  completed: "bg-pit/10 text-pit-600 border-pit/30",
  cancelled: "bg-rust/10 text-rust-600 border-rust/30",
};

export default function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STYLES[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}
