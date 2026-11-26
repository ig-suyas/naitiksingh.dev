import { NextResponse } from "next/server";
import { Resend } from "resend";
import { person } from "@/content/site";
import { contactSchema, fieldErrors } from "@/lib/contact-schema";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20_000;

/** Optional brief attachments, sent as multipart/form-data under "files". */
const MAX_FILES = 3;
const MAX_FILE_BYTES = 4 * 1024 * 1024; // total across all files
const MAX_MULTIPART_BYTES = MAX_FILE_BYTES + 512 * 1024; // files + text fields, under Vercel's 4.5 MB cap
const FILE_TYPES: Record<string, string> = {
  md: "text/markdown",
  txt: "text/plain",
  pdf: "application/pdf",
  html: "text/html",
};
// Same text as the form's own check (components/sections/ContactForm.tsx).
const FILE_ERROR =
  "Attachments must be up to 3 .md, .txt, .pdf or .html files, 4 MB in total. They were removed, so drop them in again.";

/** Rejected attachments use the form's normal field-error path, under "Project details". */
const fileRejected = () =>
  NextResponse.json(
    { ok: false, errors: { message: FILE_ERROR }, attachments: "rejected" },
    { status: 400 },
  );

/** Base name only, plain characters, extension kept, never empty. */
function safeFilename(raw: string) {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const clean = base
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9._ -]+/g, "_")
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/^[\s.]+|[\s.]+$/g, "");
  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 ? clean.slice(dot + 1).toLowerCase() : "";
  const stem = (dot > 0 ? clean.slice(0, dot) : clean).slice(0, 80) || "attachment";
  return { name: ext ? `${stem}.${ext}` : stem, ext };
}

type Attachment = { filename: string; content: Buffer; contentType: string };

/** Server-side checks on uploaded files. Returns null when any file is not acceptable. */
async function readAttachments(entries: FormDataEntryValue[]): Promise<Attachment[] | null> {
  const files = entries.filter((f): f is File => typeof f !== "string");
  if (files.length !== entries.length || files.length > MAX_FILES) return null;
  if (files.reduce((n, f) => n + f.size, 0) > MAX_FILE_BYTES) return null;
  const out: Attachment[] = [];
  for (const file of files) {
    const { name, ext } = safeFilename(file.name);
    const contentType = FILE_TYPES[ext];
    if (!contentType || file.size === 0) return null;
    const content = Buffer.from(await file.arrayBuffer());
    if (ext === "pdf" && content.subarray(0, 5).toString("latin1") !== "%PDF-") return null;
    out.push({ filename: name, content, contentType });
  }
  return out;
}

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
  const type = req.headers.get("content-type") ?? "";
  const multipart = type.includes("multipart/form-data");
  if (!multipart && !type.includes("application/json")) {
    return NextResponse.json({ ok: false, error: "Expected JSON." }, { status: 415 });
  }
  const length = req.headers.get("content-length");
  if (multipart) {
    // Briefs with attachments. Refuse before reading the body if it's too big.
    if (!length) {
      return NextResponse.json({ ok: false, error: "Length required." }, { status: 411 });
    }
    if (Number(length) > MAX_MULTIPART_BYTES) return fileRejected();
  } else if (Number(length ?? 0) > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Too large." }, { status: 413 });
  }

  let body: unknown;
  let fileEntries: FormDataEntryValue[] = [];
  try {
    if (multipart) {
      const form = await req.formData();
      fileEntries = form.getAll("files");
      const fields: Record<string, string> = {};
      for (const [k, v] of form) if (k !== "files" && typeof v === "string") fields[k] = v;
      body = fields;
    } else {
      body = await req.json();
    }
  } catch {
    const error = multipart ? "Invalid form data." : "Invalid JSON.";
    return NextResponse.json({ ok: false, error }, { status: 400 });
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

  const attachments = await readAttachments(fileEntries);
  if (!attachments) return fileRejected();

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
  if (attachments.length) rows.push(["Attached", attachments.map((a) => a.filename).join(", ")]);
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
      ...(attachments.length ? { attachments } : {}),
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
