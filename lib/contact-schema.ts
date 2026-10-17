import { z } from "zod";
import { RULES, type ContactErrors, type ContactField } from "./contact-rules";

const { name, email, projectType, budget, timeline, message } = RULES;

/** Authoritative server-side validation, built from the shared rules. */
export const contactSchema = z.object({
  name: z.string().trim().min(name.min, name.msg).max(name.max, name.long),
  email: z.string().trim().max(email.max, email.long).pipe(z.email(email.msg)),
  projectType: z.enum(projectType.options, projectType.msg),
  budget: z.enum(budget.options, budget.msg),
  timeline: z.enum(timeline.options, timeline.msg),
  message: z.string().trim().min(message.min, message.msg).max(message.max, message.long),
  /** Honeypot: real people never see or fill this. */
  website: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** First error message per field, from a failed safeParse. */
export function fieldErrors(error: z.ZodError): ContactErrors {
  const fe = z.flattenError(error).fieldErrors as Partial<Record<ContactField, string[]>>;
  const out: ContactErrors = {};
  for (const [k, v] of Object.entries(fe) as [ContactField, string[] | undefined][])
    if (v?.[0]) out[k] = v[0];
  return out;
}
