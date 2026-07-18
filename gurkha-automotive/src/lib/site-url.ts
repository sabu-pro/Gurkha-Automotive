// NEXT_PUBLIC_SITE_URL is sometimes configured without a scheme (e.g. "example.com"),
// which crashes `new URL()`. Normalize it here so every caller gets a valid absolute URL.
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}
