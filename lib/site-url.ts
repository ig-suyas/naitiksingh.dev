import { site } from "@/content/site";

/** Absolute base URL for metadata, OG images and the sitemap. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return site.fallbackUrl;
}
