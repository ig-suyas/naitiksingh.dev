# PLAN: "The Final Cut", Naitik Singh's portfolio

## Concept

The site is a film about the client's own product being built, and scrolling plays the reel. One fixed WebGL canvas sits behind real DOM text. Every act has its own **set** (a procedural 3D scene), the camera follows a path scrubbed by scroll, and cuts between sets are hidden behind film transitions: a light flash, a rack focus, an iris wipe, or a fade through black.

**Palette:** ink `#06060a`, paper `#ece6da`, tungsten amber `#E8A84B`, used sparingly cold teal `#5EC8D0`.
**Type:** Fraunces (high-contrast serif title cards), Inter Tight (body), JetBrains Mono (slates, timecode, labels).
**Film layer (DOM, cheap):** grain, vignette, light leaks, letterbox bars at 2.39:1, timecode, slate and cursor.
**Film layer (GPU):** bloom, radial chromatic aberration on the high tier, and anamorphic flare sprites.

## Facts gathered from the live projects

| | Shadeon | Haul |
|---|---|---|
| What | Library of original animated WebGL shaders: tune live, copy as React / JS / GLSL, or install through the shadcn registry | Multi-vendor marketplace: "independent makers, one checkout" |
| Stack | Next.js 16, React 19, TypeScript, WebGL/GLSL, Tailwind v4, Neon Postgres + Drizzle, Zod, Vitest, Playwright, Vercel | Java 21, Spring Boot 4, Spring Security, Spring Data JPA, PostgreSQL, JWT (jjwt), Google Sign-In, Bean Validation, Gemini assistant, Docker, Render; React + Vite on Vercel |
| Proof points | 1 WebGL context draws the whole gallery, pauses off-screen, adaptive resolution, reduced motion, static fallback, zero-dependency exports, feedback buffers (fog/ink trails) | Customer / seller / admin roles, cart, order lifecycle PENDING to DELIVERED, admin role management, image upload, AI assistant grounded in the catalog with a per-user sliding-window rate limiter |
| Repos | github.com/ig-suyas/Shadeon | github.com/ig-suyas/xzie-store-backend, /xzie-store-frontend |

Naitik wrote the Haul backend and database by hand, without AI, as a fundamentals exercise. That is framed as craftsmanship.

## Acts

The ordered list of acts and their timings lives in `lib/acts.ts`. Act time `T = index + local progress`. Progress is measured against the viewport's center line.

| T | Section id | Set (3D) | Transition out |
|---|---|---|---|
| 0 | `title`: cold open, title card, light strikes | **Projector**: volumetric beam, lens with anamorphic flare, dust lit only inside the beam | Push into the lens, then a light flash |
| 1 | `problem`: Act I, The Problem | **System**: tangled wireframe cables (custom line shader) with flickering errors | (same set) |
| 2 | `build`: Act II, The Build (hero) | **System**: cables morph into bundled routes, service blocks snap into a tiered architecture, data pulses run, camera orbits | Rack focus (blur), then a cut |
| 3 | `work`: Act III, The Proof | **Screening room**: seats, projector beams, floating screens textured with real screenshots | Iris wipe |
| 4 | `crew`: Act IV, The Crew (services, equipment rack, schedule, director's note, FAQ) | **Fog**: Shadeon-style fbm fog with a pointer wipe, dimmed | (same set) |
| 5 | `press`: Act V, Press (reserved for your review) | **Fog** | Fade through black |
| 6 | `contact`: End credits (credits roll, form, Fin.) | **Event horizon**: lensed starfield, amber accretion disk | n/a |

The 0.5–2.5 s film-leader countdown runs before the cold open. It is driven by real progress: fonts, the 3D chunk, textures and shader compilation.

## Architecture

- **One source of truth for scroll:** `lib/director.ts` holds a mutable store with `T`, page progress, velocity, pointer, per-group "beats" and transition state. `components/film/Director.tsx` owns Lenis and the GSAP ticker, and writes the store once per frame. The canvas reads the store in `useFrame` and the HUD reads it through `subscribe`. Nothing re-renders React on scroll.
- **GSAP ScrollTrigger** drives the DOM-scrubbed timelines (title push, credits roll, label reveals) from the same Lenis scroll.
- **Canvas:** dynamically imported (`ssr:false`). Device tier is `high`, `medium` or `low`. A `low` tier, a failed WebGL context or `?2d` falls back to the 2D cinematic version (`components/fallback`). Sets toggle `visible`, so only the active set draws. All shaders compile up front with `compileAsync` so cuts never hitch.
- **Reduced motion:** no Lenis, no scrubbed camera. Each act holds a still frame and changing sets cross-fades through black. Grain, flicker and cursor lag are off.

## File structure

```
app/            layout, page, globals.css, api/contact, opengraph-image, icon, sitemap, robots
components/
  canvas/       Experience, CameraRig, Effects, sets/*, shaders/*
  sections/     ColdOpen, ProblemAct, BuildAct, ProofAct, CrewAct, PressAct, EndCredits, ContactForm
  film/         Director, Loader, Letterbox, Grain, Hud (timecode/slate), Transitions, Cursor, Sound
  ui/           Nav, Magnetic, Slate, Chip
  fallback/     Fallback2D, TangleSvg, ArchitectureSvg
content/        site.ts: every word, link and project ([CONFIRM] markers)
lib/            director, acts, device, audio, contact schema, rate limit, site url
scripts/        capture-screens.mjs (headless Chrome + sharp)
public/         projects/*.webp
```

## Performance budget

- First load JS without 3D: about 190 KB gzip or less (React/Next, GSAP+ScrollTrigger, Lenis, motion via LazyMotion).
- 3D chunk loads lazily after first paint: about 300 KB gzip or less (three, r3f, postprocessing). On touch devices it starts after the first interaction or once the page is idle, so it stays out of the mobile Lighthouse window.
- LCP element is SSR text (the leader digit / title). Fonts come from `next/font` with swap and only two are preloaded.
- DPR: high tier up to 2, medium (phones) up to 1.5, with adaptive DPR on frame drops. One canvas, instanced seats, under 10k line vertices, no external models.
- Rendering stops when the tab is hidden. The fullscreen-shader sets run at reduced resolution on medium tier.
- Target: Lighthouse mobile performance at least 85, accessibility at least 95.

## Contact

The form posts to a Route Handler: zod validation, a honeypot, an in-memory sliding-window rate limit, and Resend when `RESEND_API_KEY` is set. When it isn't set, the client gets `503 {fallback:"mailto"}` and shows a pre-filled mailto link.
