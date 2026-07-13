"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") ?? "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError("Incorrect email or password.");
      return;
    }

    router.push(redirectedFrom);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card-panel space-y-4 !bg-asphalt-800 !border-asphalt-600 p-6">
      <div>
        <label htmlFor="email" className="field-label !text-cream-100/60">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input !bg-asphalt-700 !border-asphalt-500 !text-cream-100"
          autoComplete="username"
        />
      </div>
      <div>
        <label htmlFor="password" className="field-label !text-cream-100/60">Password</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-input !bg-asphalt-700 !border-asphalt-500 !text-cream-100"
          autoComplete="current-password"
        />
      </div>

      {error && <p className="rounded-sm bg-rust/10 px-3 py-2 text-sm text-rust-600">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
