import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getResendClient } from "@/lib/resend";
import { BUSINESS } from "@/lib/constants";

export const runtime = "nodejs";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Please enter a message.").max(2000),
});

export async function POST(request: NextRequest) {
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
  const garageInbox = process.env.GARAGE_NOTIFICATION_EMAIL;
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Gurkha Automotive <onboarding@resend.dev>";

  if (!garageInbox) {
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
