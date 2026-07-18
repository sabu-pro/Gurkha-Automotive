// Pure client-side typo check — no network call, no API, no cost.
// Flags likely-mistyped email domains (e.g. "gnail.com") before the
// customer even submits the form, using a small list of common
// providers (including the Australian ISPs a local garage's customers
// are likely to use) and a simple edit-distance comparison.

const KNOWN_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.com.au",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "bigpond.com",
  "bigpond.net.au",
  "optusnet.com.au",
  "tpg.com.au",
  "iinet.net.au",
  "westnet.com.au",
  "aussiebroadband.com.au",
];

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/**
 * Returns a corrected email if the domain looks like a close typo of a
 * common provider (edit distance 1-2), otherwise null. E.g.
 * "jane@gnail.com" -> "jane@gmail.com".
 */
export function suggestEmailCorrection(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain || KNOWN_DOMAINS.includes(domain)) return null;

  let best: { domain: string; distance: number } | null = null;
  for (const known of KNOWN_DOMAINS) {
    const distance = levenshtein(domain, known);
    if (distance > 0 && distance <= 2 && (!best || distance < best.distance)) {
      best = { domain: known, distance };
    }
  }

  return best ? `${local}@${best.domain}` : null;
}
