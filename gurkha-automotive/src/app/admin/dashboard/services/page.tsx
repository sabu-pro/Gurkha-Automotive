import type { Metadata } from "next";
import { getAllServices } from "@/lib/data";
import ManageServices from "@/components/admin/ManageServices";

export const metadata: Metadata = {
  title: "Manage Services",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ManageServicesPage() {
  const services = await getAllServices();

  return (
    <div>
      <div className="mb-8">
        <span className="eyebrow">Dashboard</span>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-asphalt-800">
          Manage Services
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-steel-500">
          Anything you change here updates the website straight away — the services page, the
          homepage and the booking form all read from this list.
        </p>
      </div>

      <ManageServices services={services} />
    </div>
  );
}
