"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error ?? "Something went wrong.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="card-panel border-l-4 !border-l-pit-600 p-6">
        <h3 className="font-display text-lg font-semibold uppercase text-asphalt-800">
          Message sent
        </h3>
        <p className="mt-2 text-sm text-steel-500">
          Thanks for reaching out — we&apos;ll get back to you as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-panel space-y-4 p-6">
      <div>
        <label htmlFor="name" className="field-label">Full name</label>
        <input id="name" name="name" required className="field-input" placeholder="Jane Smith" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" name="email" type="email" required className="field-input" placeholder="jane@example.com" />
        </div>
        <div>
          <label htmlFor="phone" className="field-label">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" className="field-input" placeholder="04xx xxx xxx" />
        </div>
      </div>
      <div>
        <label htmlFor="message" className="field-label">Message</label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="field-input resize-none"
          placeholder="How can we help?"
        />
      </div>

      {status === "error" && (
        <p className="rounded-sm bg-rust/10 px-3 py-2 text-sm text-rust-600">{errorMessage}</p>
      )}

      <button type="submit" className="btn-dark w-full" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
