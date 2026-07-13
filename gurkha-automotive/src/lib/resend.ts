import { Resend } from "resend";

let resendClient: Resend | null = null;

/**
 * Lazily-created Resend client. Lazy so that build-time steps which
 * don't send email (like static analysis) don't fail just because
 * RESEND_API_KEY isn't set yet in that environment.
 */
export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set. Add it to your environment variables.");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}
