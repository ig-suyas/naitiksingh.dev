import { budgets, projectTypes, timelines } from "@/content/site";

/**
 * One source for the contact form's limits and messages. The server builds its
 * zod schema from these (lib/contact-schema.ts); the browser runs the tiny
 * `validateContact` below so zod never ships to the client.
 */
export const RULES = {
  name: { min: 2, max: 100, msg: "Please tell me your name.", long: "That name is a bit long." },
  email: {
    max: 200,
    msg: "Please enter a valid email address.",
    long: "That email is a bit long.",
  },
  projectType: { options: projectTypes, msg: "Pick the closest project type." },
  budget: { options: budgets, msg: "Pick a budget range (“Not sure yet” is fine)." },
  timeline: { options: timelines, msg: "Pick a timeline." },
  message: {
    min: 20,
    max: 4000,
    msg: "A couple of sentences helps: what are you building, and for whom?",
    long: "Please keep it under 4,000 characters.",
  },
} as const;

export type ContactField = keyof typeof RULES;
export type ContactErrors = Partial<Record<ContactField, string>>;
export const FIELD_ORDER = Object.keys(RULES) as ContactField[];

/** Pragmatic email shape check; the server's zod email check is authoritative. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateContact(raw: Record<string, string>): ContactErrors {
  const v = (k: ContactField) => (raw[k] ?? "").trim();
  const e: ContactErrors = {};
  const { name, email, message } = RULES;
  if (v("name").length < name.min) e.name = name.msg;
  else if (v("name").length > name.max) e.name = name.long;
  if (!EMAIL.test(v("email"))) e.email = email.msg;
  else if (v("email").length > email.max) e.email = email.long;
  for (const k of ["projectType", "budget", "timeline"] as const) {
    if (!(RULES[k].options as readonly string[]).includes(v(k))) e[k] = RULES[k].msg;
  }
  if (v("message").length < message.min) e.message = message.msg;
  else if (v("message").length > message.max) e.message = message.long;
  return e;
}
