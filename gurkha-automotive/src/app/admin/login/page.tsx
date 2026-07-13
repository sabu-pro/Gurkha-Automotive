import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-asphalt-900 py-16">
      <div className="container-page flex justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <span className="eyebrow">Staff Only</span>
            <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-cream-100">
              Admin Login
            </h1>
          </div>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
