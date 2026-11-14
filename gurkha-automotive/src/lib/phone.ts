// Australian phone number checks. Pure functions with no Node-only
// imports, so the booking form and the chat assistant can validate in
// the browser with exactly the same rules the server applies.
//
// This proves a number is *structurally* a real AU number (rules out
// "1234567890" or a wrong digit count) — not that this customer owns
// it. That needs an SMS one-time code, which costs money per message,
// so it's intentionally left out.

/** Strip spaces/punctuation and convert +61 / 61 to a leading 0. */
export function normaliseAuPhone(raw: string): string {
  return raw
    .trim()
    .replace(/[\s().-]/g, "")
    .replace(/^\+?61/, "0");
}

export function isValidAuPhone(raw: string): boolean {
  const normalized = normaliseAuPhone(raw);
  // Mobile: 04XX XXX XXX
  if (/^04\d{8}$/.test(normalized)) return true;
  // Landline: 0[2,3,7,8] XXXX XXXX
  if (/^0[2378]\d{8}$/.test(normalized)) return true;
  return false;
}

/** "0412345678" → "0412 345 678", "0391234567" → "03 9123 4567". Leaves invalid input untouched. */
export function formatAuPhone(raw: string): string {
  const n = normaliseAuPhone(raw);
  if (/^04\d{8}$/.test(n)) return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  if (/^0[2378]\d{8}$/.test(n)) return `${n.slice(0, 2)} ${n.slice(2, 6)} ${n.slice(6)}`;
  return raw.trim();
}
