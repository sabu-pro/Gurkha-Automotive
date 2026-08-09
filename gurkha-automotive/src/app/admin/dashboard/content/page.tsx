import type { Metadata } from "next";
import { getSiteContentMap } from "@/lib/data";
import EditContent from "@/components/admin/EditContent";

export const metadata: Metadata = {
  title: "Page Content",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditContentPage() {
  const overrides = await getSiteContentMap();

  return (
    <div>
      <div className="mb-8">
        <span className="eyebrow">Dashboard</span>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-asphalt-800">
          Page Content
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-steel-500">
          Change the wording on the public pages. Each box starts with the current text — edit it
          and press Save, and the website updates straight away.
        </p>
      </div>

      <EditContent overrides={overrides} />
    </div>
  );
}
