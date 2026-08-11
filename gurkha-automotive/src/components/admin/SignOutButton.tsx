"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** `className` lets the mobile admin menu give this the same row shape as the links. */
export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={
        className ??
        "text-xs font-bold uppercase tracking-wide text-cream-100/70 hover:text-amber-400 disabled:opacity-50"
      }
    >
      {loading ? "Signing out…" : "Sign Out"}
    </button>
  );
}
