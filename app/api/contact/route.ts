import { NextResponse } from "next/server";
import { Resend } from "resend";
import { person } from "@/content/site";
import { contactSchema, fieldErrors } from "@/lib/contact-schema";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20_000;

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ ok: false, error: "Expected JSON." }, { status: 415 });
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  // Honeypot: bots fill every field. Pretend it worked and drop it.
  if (
    body &&
    typeof body === "object" &&
    "website" in body &&
    (body as { website?: unknown }).website
  ) {
    return NextResponse.json({ ok: true });
  }

  const limit = rateLimit(clientIp(req));
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests.", retryAfter: limit.retryAfter },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // No mail service configured: the client falls back to a pre-filled mailto.
    return NextResponse.json(
      { ok: false, fallback: "mailto", email: person.email },
      { status: 503 },
    );
  }

  const d = parsed.data;
  const to = process.env.CONTACT_TO_EMAIL || person.email;
  const from = process.env.CONTACT_FROM_EMAIL || "Portfolio <onboarding@resend.dev>";
  const rows: [string, string][] = [
    ["Name", d.name],
    ["Email", d.email],
    ["Project type", d.projectType],
    ["Budget", d.budget],
    ["Timeline", d.timeline],
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${d.message}`;
  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:600px">
      <p style="font:12px ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;color:#b07a2a">New project brief</p>
      <table style="border-collapse:collapse;margin:16px 0">
        ${rows.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#777">${k}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`).join("")}
      </table>
      <p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(d.message)}</p>
    </div>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [to],
      replyTo: d.email,
      subject: `Project brief: ${d.projectType} (${d.name})`,
      text,
      html,
    });
    if (error) {
      console.error("[contact] resend error", error);
      return NextResponse.json({ ok: false, fallback: "mailto" }, { status: 502 });
    }
  } catch (err) {
    console.error("[contact] send failed", err);
    return NextResponse.json({ ok: false, fallback: "mailto" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
