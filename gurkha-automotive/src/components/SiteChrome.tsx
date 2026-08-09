"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the public site header/footer on admin routes.
 *
 * The root layout renders <Header /> and <Footer /> for every route,
 * but /admin/* has its own dedicated header in
 * src/app/admin/dashboard/layout.tsx — rendering both stacked two dark
 * bars, each with its own copy of the logo.
 *
 * Children are passed in from the root layout rather than imported
 * here, so Header and Footer keep their own server/client boundaries.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
