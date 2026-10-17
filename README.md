# The Final Cut: Naitik Singh's portfolio

A cinematic, scroll-driven 3D portfolio. Scrolling plays the film: a cold open, then Act I (the tangle), Act II (the architecture assembles), Act III (the screening room), Act IV (services, stack, process, FAQ), Act V (press) and the end credits with the contact form. Concept and architecture are in [PLAN.md](PLAN.md).

**Stack:** Next.js 16 (App Router, TypeScript strict), React Three Fiber + drei + postprocessing, GSAP ScrollTrigger + Lenis, Tailwind CSS v4, motion (lazy), zod + Resend.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run capture    # re-screenshot the live projects into /public/projects (needs Chrome)
```

URL flags for testing: `?2d` forces the 2D fallback and `?3d` forces 3D. In development, `window.__director` and `window.__r3f` are exposed for debugging.

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable               | Purpose                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL, OG images and sitemap. On Vercel it falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then to `site.fallbackUrl` in `/content/site.ts`. |
| `RESEND_API_KEY`       | Sends contact-form email. When it is unset, the form falls back to a pre-filled `mailto:`.                                                          |
| `CONTACT_TO_EMAIL`     | Inbox for enquiries (defaults to the email in `/content/site.ts`).                                                                                  |
| `CONTACT_FROM_EMAIL`   | A sender on a domain verified in Resend (defaults to Resend's test sender).                                                                         |

## Deploy (Vercel)

1. Push the repo to GitHub and import it in Vercel. The framework preset is Next.js.
2. Add the environment variables above.
3. Verify your domain in Resend and set `CONTACT_FROM_EMAIL` to an address on it.
4. Add your custom domain and set `NEXT_PUBLIC_SITE_URL` to it.

## How to edit content

All copy, links, projects, services, skills, the process, the FAQ and the credits live in **`/content/site.ts`**. Components only read from it.

- **Projects:** edit the `projects` array. Posters live in `/public/projects/<slug>.webp` (1600×1000) with a `<slug>-tex.webp` (1024×640) for the 3D screen. Add a target to `scripts/capture-screens.mjs` and run `npm run capture`.
- **Skill tiers:** `Core`, `Comfortable` or `Exploring`.
- **Testimonials:** add real quotes to `testimonials` to replace the "Reserved for your review" placeholder. Set `pressAct.reserved` to `""` to hide the act instead.
- **Architecture in Act II:** `architecture.nodes` and `architecture.edges` (positions are 3D units).
- **Empty fields:** empty strings (LinkedIn, location, timezone) are hidden automatically.

## Accessibility and performance

- **Reduced motion:** with `prefers-reduced-motion`, there is no smooth scroll and no scrubbed camera. Each act holds a still frame and changes of set cross-fade through black.
- **Device tiers:** desktop gets full 3D. Phones get lighter 3D that loads on first touch or once the page is idle, with the 2D film shown until then. Devices without WebGL, or with only software WebGL, get the 2D film only.
- **Accessible markup:** all text is real DOM, the 3D labels are mirrored in a screen-reader list, and the page has a skip link, landmarks and visible focus states.

### Lighthouse (mobile, production build, five runs)

| Performance       | Accessibility | Best practices | SEO | FCP   | LCP   | TBT        | CLS   |
| ----------------- | ------------- | -------------- | --- | ----- | ----- | ---------- | ----- |
| 88–93 (median 91) | 100           | 100            | 100 | 0.9 s | 2.9 s | 110–290 ms | 0.004 |

LCP is Lighthouse's simulated slow-4G figure; the observed paint is about 0.4 s. The remaining gap to 2.5 s is mostly the Next.js/React baseline plus the two display fonts.

What keeps it fast, so future changes don't undo it:

- **First-load JS is ~196 KB gzip.** three.js, postprocessing, GSAP, Lenis, motion, the 2D fallback and the contact form are all lazy chunks. GSAP and Lenis load once the page is idle (`lib/idle.ts`), because nothing can scroll until the film leader finishes. Keep new `gsap` imports behind `loadGsap()` / `useGsap()` in `lib/use-gsap.ts`.
- **Fonts are ~100 KB.** Fraunces (without the opsz axis) is the only font that swaps. JetBrains Mono is `display: optional`, and body text uses the system UI stack. Every swapping web font forces a full-page re-layout on phones.
- **Rendering:**
  - Heavy blocks below the fold use `content-visibility: auto` (`.cv`, `.cv-children`).
  - One-shot reveals are CSS transitions driven by a single IntersectionObserver (`data-reveal`).
  - The letterbox animates with `transform`, never a `:root` variable.
- **Few running CSS animations.** Each continuously running CSS animation costs a style pass every frame on phones, so the film grain is the only always-on one.
- **Re-check after changes:** run `npm run build && npm start`, then audit with Lighthouse in Chrome DevTools on the Mobile preset.

## Launch checklist (search the code for `[CONFIRM]`)

- [ ] **Name:** confirm the spelling "Naitik Singh". The original brief said "Natik"; I went with the spelling in your email and GitHub repo.
- [x] **Production domain:** live at naitiksinghdev.vercel.app; set `NEXT_PUBLIC_SITE_URL` if you add a custom domain.
- [ ] **LinkedIn and other socials:** `person.linkedin`, `person.otherSocials`.
- [ ] **Location and timezone (optional):** `person.location`, `person.timezone`.
- [x] **Pricing:** current budget brackets kept.
- [ ] **Support window:** its length (FAQ "What happens after launch?").
- [ ] **Response time:** the promise in `contactAct.sub` ("within one working day").
- [ ] **GraphQL tier:** confirm it in `skills`.
- [x] **Email delivery:** the mailto fallback is the chosen setup; add `RESEND_API_KEY` later only if you want direct sends.
- [ ] **Testimonials:** add real ones when you have them. Never invent any.
