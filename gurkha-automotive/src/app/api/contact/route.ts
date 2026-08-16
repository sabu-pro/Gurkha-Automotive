import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getResendClient } from "@/lib/resend";
import { garageInboxes } from "@/lib/email";
import { BUSINESS } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/utils";
import { domainAcceptsMail, optionalPhoneSchema } from "@/lib/validation";

export const runtime = "nodejs";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: optionalPhoneSchema,
  message: z.string().trim().min(5, "Please enter a message.").max(2000),
});

export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit(request, "contact", 3, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid enquiry." },
      { status: 400 }
    );
  }

  const { name, email, phone, message } = parsed.data;

  if (!(await domainAcceptsMail(email))) {
    return NextResponse.json(
      { error: "That email address doesn't look valid — please check for typos." },
      { status: 400 }
    );
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Gurkha Automotive <onboarding@resend.dev>";

  let garageInbox: string[];
  try {
    garageInbox = garageInboxes();
  } catch {
    console.error("GARAGE_NOTIFICATION_EMAIL is not set.");
    return NextResponse.json({ error: "Enquiries are temporarily unavailable. Please call us instead." }, { status: 500 });
  }

  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: fromAddress,
      to: garageInbox,
      replyTo: email,
      subject: `Website enquiry from ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#16181B;">
          <h2 style="margin:0 0 12px;">New enquiry — ${BUSINESS.name} website</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
          <p><strong>Message:</strong></p>
          <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send contact email:", error);
    return NextResponse.json({ error: "Could not send your message. Please call us instead." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
