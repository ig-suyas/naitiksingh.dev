"use client";

import { useRef, useState, type FormEvent } from "react";
import { AnimatePresence, LazyMotion, m } from "motion/react";
import { loadMotionFeatures } from "@/lib/load-motion";
import { budgets, contactAct, person, projectTypes, timelines } from "@/content/site";
import {
  FIELD_ORDER,
  validateContact,
  type ContactErrors,
  type ContactField,
} from "@/lib/contact-rules";
import { Magnetic } from "@/components/ui/Magnetic";

type Status = "idle" | "submitting" | "success" | "error" | "fallback";
type Errors = ContactErrors;

function mailtoHref(data: Record<string, string>) {
  const subject = `Project brief: ${data.projectType || "new project"}${data.name ? ` (${data.name})` : ""}`;
  const body = [
    data.message,
    "",
    `Project type: ${data.projectType ?? ""}`,
    `Budget: ${data.budget ?? ""}`,
    `Timeline: ${data.timeline ?? ""}`,
    `Name: ${data.name ?? ""}`,
    `Email: ${data.email ?? ""}`,
  ].join("\n");
  return `mailto:${person.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function Field({
  id,
  label,
  error,
  children,
  hint,
}: {
  id: ContactField;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`f-${id}`} className="mono-label text-muted">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`f-${id}-hint`} className="text-dim text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`f-${id}-error`} className="text-error text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

/** Project brief form: instant checks in the browser, zod on the server, mailto as a fallback. */
export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");
  const [mailto, setMailto] = useState(`mailto:${person.email}`);
  const [sentTo, setSentTo] = useState("");
  /** Offer the mailto escape hatch only when the problem is on the server side. */
  const [offerMail, setOfferMail] = useState(false);

  const aria = (id: ContactField) => ({
    id: `f-${id}`,
    name: id,
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby": errors[id] ? `f-${id}-error` : undefined,
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setMailto(mailtoHref(raw));
    setOfferMail(false);

    const next: Errors = validateContact(raw);
    if (Object.keys(next).length) {
      setErrors(next);
      setStatus("error");
      setMessage("A few details need another take. Check the highlighted fields.");
      const first = FIELD_ORDER.find((k) => next[k]);
      if (first) formRef.current?.querySelector<HTMLElement>(`#f-${first}`)?.focus();
      return;
    }

    setErrors({});
    setStatus("submitting");
    setMessage("Sending your brief…");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(raw),
      });
      const body = (await res.json().catch(() => ({}))) as {
        fallback?: string;
        errors?: Errors;
        retryAfter?: number;
      };
      if (res.ok) {
        setSentTo(raw.email?.trim() ?? "");
        setStatus("success");
        setMessage("Brief received.");
        return;
      }
      if (body.fallback === "mailto") {
        setStatus("fallback");
        setOfferMail(true);
        setMessage(
          "The form's mail service isn't connected yet, so your email app will finish the job.",
        );
        return;
      }
      if (res.status === 400 && body.errors) {
        setErrors(body.errors);
        setStatus("error");
        setMessage("A few details need another take. Check the highlighted fields.");
        return;
      }
      if (res.status === 429) {
        const mins = Math.max(1, Math.ceil((body.retryAfter ?? 600) / 60));
        setStatus("error");
        setOfferMail(true);
        setMessage(
          `That's a lot of briefs at once. Try again in about ${mins} min, or email me directly.`,
        );
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch {
      setStatus("error");
      setOfferMail(true);
      setMessage(
        "Something went wrong on my side. Your words are still here: try again, or send them by email.",
      );
    }
  }

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <div className="panel relative overflow-hidden rounded-2xl p-6 sm:p-9">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h3 className="mono-label text-paper">{contactAct.formTitle}</h3>
          <span className="mono-label text-dim">Take 1</span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {status === "success" ? (
            <m.div
              key="done"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-[420px] flex-col justify-center"
            >
              <p className="mono-label text-teal">Brief received</p>
              <p className="font-display mt-4 text-[clamp(2.4rem,5vw,4rem)] leading-none font-light italic">
                That&rsquo;s a wrap.
              </p>
              <p className="text-paper/80 mt-5 max-w-[42ch]">
                Thanks. I&rsquo;ll read it properly and reply to{" "}
                <span className="text-paper">{sentTo}</span> within one working day.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setMessage("");
                }}
                className="mono-label border-paper/30 text-muted hover:text-paper mt-8 self-start border-b pb-1"
              >
                Send another brief
              </button>
            </m.div>
          ) : (
            <m.form
              key="form"
              ref={formRef}
              noValidate
              onSubmit={onSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="grid gap-6"
              aria-describedby="form-status"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <Field id="name" label="Your name" error={errors.name}>
                  <input
                    {...aria("name")}
                    className="field"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </Field>
                <Field id="email" label="Email" error={errors.email}>
                  <input
                    {...aria("email")}
                    className="field"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    maxLength={200}
                  />
                </Field>
              </div>
              <Field id="projectType" label="Project type" error={errors.projectType}>
                <select {...aria("projectType")} className="field" defaultValue="" required>
                  <option value="" disabled>
                    Choose the closest fit
                  </option>
                  {projectTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field id="budget" label="Budget range" error={errors.budget}>
                  <select {...aria("budget")} className="field" defaultValue="" required>
                    <option value="" disabled>
                      Choose a range
                    </option>
                    {budgets.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </Field>
                <Field id="timeline" label="Timeline" error={errors.timeline}>
                  <select {...aria("timeline")} className="field" defaultValue="" required>
                    <option value="" disabled>
                      When do you need it?
                    </option>
                    {timelines.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field
                id="message"
                label="The plot"
                error={errors.message}
                hint="What are you building, who is it for, and what does success look like?"
              >
                <textarea
                  {...aria("message")}
                  aria-describedby={errors.message ? "f-message-error" : "f-message-hint"}
                  className="field min-h-36 resize-y"
                  rows={5}
                  required
                  maxLength={4000}
                />
              </Field>

              {/* Honeypot: hidden from people and assistive tech. */}
              <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="f-website">Website</label>
                <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <div className="flex flex-col gap-5 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Magnetic>
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    data-cursor="Action"
                    className="mono-label bg-amber text-ink hover:bg-amber-hot flex h-12 items-center gap-3 rounded-full px-6 transition-colors disabled:cursor-wait disabled:opacity-70"
                  >
                    {status === "submitting" ? (
                      <>
                        <span
                          className="border-ink/30 border-t-ink size-3 animate-spin rounded-full border"
                          aria-hidden="true"
                        />
                        Rolling…
                      </>
                    ) : (
                      "Send the brief"
                    )}
                  </button>
                </Magnetic>
                <p className="text-dim text-sm">
                  Prefer email?{" "}
                  <a
                    href={`mailto:${person.email}`}
                    className="text-paper/80 underline-offset-4 hover:underline"
                  >
                    {person.email}
                  </a>
                </p>
              </div>

              <div id="form-status" aria-live="polite" className="min-h-6 text-sm">
                {message && status !== "idle" && (
                  <m.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={
                      status === "error"
                        ? "text-error"
                        : status === "fallback"
                          ? "text-amber"
                          : "text-muted"
                    }
                  >
                    <p>{message}</p>
                    {offerMail && (
                      <a
                        href={mailto}
                        className="mono-label hover:bg-paper/5 mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-current px-4"
                      >
                        Open in your email app →
                      </a>
                    )}
                  </m.div>
                )}
              </div>
            </m.form>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
