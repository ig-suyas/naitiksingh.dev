"use client";

import { useState } from "react";
import { person } from "@/content/site";

/** Copies the email address; falls back to opening the mail app. */
export function CopyEmail() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      data-cursor="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          window.location.href = `mailto:${person.email}`;
        }
      }}
      className="mono-label border-paper/20 text-muted hover:border-paper/50 hover:text-paper rounded-full border px-3 py-1.5 transition-colors"
    >
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
