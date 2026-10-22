/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ALL COPY, LINKS AND PROJECT DATA LIVE HERE.
 *  Edit this file to change what the site says; no component changes needed.
 *
 *  Search for  [CONFIRM]  to find every value Naitik still has to fill in or
 *  double-check. Empty strings / empty arrays are hidden gracefully in the UI.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Tier = "Core" | "Comfortable" | "Exploring";

export interface Person {
  name: string;
  /** Short form used by the monogram and title card. */
  firstName: string;
  role: string;
  subtitle: string;
  tagline: string;
  bio: string[];
  email: string;
  github: string;
  linkedin: string;
  otherSocials: { label: string; href: string }[];
  location: string;
  timezone: string;
  availability: { open: boolean; label: string; detail: string };
}

export interface Project {
  slug: string;
  title: string;
  logline: string;
  genre: string;
  year: string;
  role: string;
  problem: string;
  solution: string;
  outcomes: [string, string, string];
  stack: string[];
  live: string;
  repos: { label: string; href: string }[];
  /** 1600×1000 poster in /public/projects (see `npm run capture`). */
  poster: string;
  /** 1024×640 texture for the 3D screen. */
  texture: string;
  posterAlt: string;
  note?: string;
  /** Accent used for the poster glow; keep it within the film palette. */
  tint: string;
}

export interface Service {
  title: string;
  /** e.g. "Starting at $1,500". */
  price: string;
  /** Duration or billing terms, shown next to the price. */
  terms: string;
  pitch: string;
  deliverables: string[];
}

export interface SkillGroup {
  group: string;
  items: { name: string; tier: Tier }[];
}

export interface Stage {
  reel: string;
  title: string;
  film: string;
  body: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  outlet?: string;
}

// ── Person ───────────────────────────────────────────────────────────────────

export const person: Person = {
  name: "Naitik Singh",
  firstName: "Naitik",
  role: "Full-stack software engineer",
  subtitle:
    "I build and fix Spring Boot backends for US startups: marketplaces, auth, payments, APIs.",
  tagline: "Software that ships.",
  bio: [
    "I'm Naitik, a self-taught full-stack engineer who learned by shipping. My home turf is the backend: Java, Spring Boot and Postgres, written carefully and tested properly.",
    "I care just as much about the part people see, which is why my side projects end up as WebGL shader libraries. I take on a small number of freelance projects at a time, so each one gets my full attention from first call to launch.",
  ],
  email: "naitiksingh.dev@gmail.com",
  github: "https://github.com/ig-suyas",
  linkedin: "https://www.linkedin.com/in/naitik-singh-b29ab1444/",
  otherSocials: [], // [CONFIRM] e.g. { label: "X", href: "https://x.com/…" }
  location: "", // [CONFIRM] city/country; hidden while empty
  timezone: "", // [CONFIRM] e.g. "IST (UTC+5:30)"; hidden while empty
  availability: {
    open: true,
    label: "Available for freelance",
    detail: "Booking new projects now",
  },
};

export const site = {
  title: "Naitik Singh: Full-stack engineer. Software that ships.",
  description:
    "Naitik Singh is a freelance full-stack engineer building web apps, Java/Spring Boot APIs, marketplaces and interactive 3D sites. Now showing: your project.",
  keywords: [
    "freelance full-stack developer",
    "Spring Boot developer",
    "Java backend engineer",
    "Next.js developer",
    "WebGL developer",
    "SaaS MVP",
  ],
  /** Fallback when NEXT_PUBLIC_SITE_URL / Vercel URL are not available. */
  /** Vercel URL until a custom domain is added; NEXT_PUBLIC_SITE_URL overrides it. */
  fallbackUrl: "https://naitiksinghdev.vercel.app",
  shaderCredit: { label: "Shadeon", href: "https://shadeon-chi.vercel.app/" },
};

// ── Acts: short, punchy cinema copy ──────────────────────────────────────────

export const coldOpen = {
  presents: "A Naitik Singh production",
  scrollCue: "Scroll to roll film",
};

export const problemAct = {
  slate: "Act I",
  title: "The Problem",
  heading: "Every product starts as a tangle.",
  beats: [
    "A good idea, stuck behind a slow backend.",
    "Bugs nobody can reproduce. Pages that crawl.",
    "A codebase that fights every new feature.",
  ],
  close: "You don't need more code. You need it untangled.",
};

export const buildAct = {
  slate: "Act II",
  title: "The Build",
  heading: "Then the system comes together.",
  body: "I design the system first, then build every layer of it: the interface, the APIs, the data and the pipeline that ships it.",
  close: "Clean boundaries. Typed contracts. Tested paths. Deployed on every push.",
};

/**
 * The architecture that assembles in Act II. Positions are in 3D world units
 * (x right, y up, z towards camera). Edges connect nodes by id.
 */
export const architecture = {
  nodes: [
    {
      id: "frontend",
      label: "Frontend",
      stack: "Next.js · React · Three.js",
      pos: [0, 2.5, 0],
      size: [2.8, 0.42, 1.1],
    },
    {
      id: "gateway",
      label: "API Gateway",
      stack: "Spring Cloud Gateway · JWT / OAuth2",
      pos: [0, 1.25, 0],
      size: [2.1, 0.36, 0.9],
    },
    {
      id: "auth",
      label: "Auth service",
      stack: "Spring Security",
      pos: [-2.3, 0, 0.5],
      size: [1.35, 0.42, 0.95],
    },
    {
      id: "orders",
      label: "Orders service",
      stack: "Spring Boot · REST",
      pos: [0, 0, 0],
      size: [1.35, 0.42, 0.95],
    },
    {
      id: "catalog",
      label: "Catalog service",
      stack: "Node.js · GraphQL",
      pos: [2.3, 0, -0.5],
      size: [1.35, 0.42, 0.95],
    },
    {
      id: "queue",
      label: "Event bus",
      stack: "Kafka",
      pos: [-1.25, -1.3, -0.7],
      size: [1.5, 0.3, 0.7],
    },
    { id: "cache", label: "Cache", stack: "Redis", pos: [1.35, -1.3, 0.7], size: [1.2, 0.3, 0.7] },
    {
      id: "db",
      label: "Database",
      stack: "PostgreSQL · MongoDB",
      pos: [0, -2.55, 0],
      size: [3.2, 0.46, 1.3],
    },
  ],
  edges: [
    ["frontend", "gateway"],
    ["gateway", "auth"],
    ["gateway", "orders"],
    ["gateway", "catalog"],
    ["orders", "queue"],
    ["queue", "catalog"],
    ["catalog", "cache"],
    ["auth", "db"],
    ["orders", "db"],
    ["catalog", "db"],
  ],
  platform: { label: "Shipped with", stack: "Docker · GitHub Actions · AWS · Vercel" },
} as const;

export const proofAct = {
  slate: "Act III",
  title: "The Proof",
  heading: "Selected work.",
  sub: "Two features, both live. Each one built, deployed and maintained solo.",
};

// ── Projects ─────────────────────────────────────────────────────────────────

export const projects: Project[] = [
  {
    slug: "shadeon",
    title: "Shadeon",
    logline: "Original animated WebGL shaders you tune live, then paste anywhere.",
    genre: "Obsessive about performance and craft",
    year: "2026",
    role: "Solo: product, design, engineering, shaders and launch",
    problem:
      "Shader backgrounds look incredible, but they usually ship with a heavy runtime, a dependency chain and a page that makes laptop fans spin.",
    solution:
      "A gallery where every shader is tuned live (colors, speed, scale, seed), then exported as one self-contained React component, plain JavaScript or raw GLSL.",
    outcomes: [
      "Zero-dependency exports: every shader is a single file, also installable through the shadcn CLI.",
      "One WebGL context draws the whole gallery. Shaders pause off-screen and lower their resolution when frames drop.",
      "Considerate by default: a still frame for reduced motion and a static gradient when WebGL isn't available.",
    ],
    stack: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "WebGL / GLSL",
      "Tailwind CSS",
      "Postgres (Neon)",
      "Drizzle",
      "Zod",
      "Vitest",
      "Playwright",
      "Vercel",
    ],
    live: "https://shadeon-chi.vercel.app/",
    repos: [{ label: "Source", href: "https://github.com/ig-suyas/Shadeon" }],
    poster: "/projects/shadeon.webp",
    texture: "/projects/shadeon-tex.webp",
    posterAlt:
      "Shadeon home page: a swirling particle shader above the headline “Animated shaders, ready to paste.”",
    tint: "#E8A84B",
  },
  {
    slug: "haul",
    title: "Haul",
    logline: "A multi-vendor marketplace: independent makers, one checkout.",
    genre: "Complex commerce, simple experience",
    year: "2026",
    role: "Solo. API, security and data model written by hand, without AI assistance, as a backend fundamentals workout.",
    problem:
      "A marketplace serves three audiences at once: shoppers who want one cart, sellers who manage stock and orders, and admins who keep the whole thing honest.",
    solution:
      "A Spring Boot API with stateless auth and role-based access for customers, sellers and admins, backed by a relational model for catalog, carts and orders.",
    outcomes: [
      "JWT sessions with Google Sign-In, and role-based routes for shoppers, sellers and admins.",
      "Orders follow a clear lifecycle (pending, processing, shipped, delivered) that sellers and admins drive.",
      "An AI shopping assistant grounded in the live catalog, protected by a per-user sliding-window rate limiter.",
    ],
    stack: [
      "Java 21",
      "Spring Boot 4",
      "Spring Security",
      "Spring Data JPA",
      "PostgreSQL",
      "JWT",
      "Google OAuth",
      "Docker",
      "Render",
      "React",
      "Vite",
    ],
    live: "https://xzie-store-frontend.vercel.app/",
    repos: [
      { label: "Backend", href: "https://github.com/ig-suyas/xzie-store-backend" },
      { label: "Frontend", href: "https://github.com/ig-suyas/xzie-store-frontend" },
    ],
    poster: "/projects/haul.webp",
    texture: "/projects/haul-tex.webp",
    posterAlt:
      "Haul storefront: the headline “Everyday goods. Delivered with care.” beside product photos of headphones, a lamp and a coffee dripper.",
    note: "The demo API runs on a free tier, so the first visit can take about 30 seconds to wake up.",
    tint: "#5EC8D0",
  },
];

// ── Act IV: the crew ─────────────────────────────────────────────────────────

export const crewAct = {
  slate: "Act IV",
  title: "Services",
  heading: "Services & pricing.",
  sub: "Three fixed-price ways to work together.",
};

export const services: Service[] = [
  {
    title: "Backend audit + fix plan",
    price: "Starting at $1,500",
    terms: "1 week",
    pitch:
      "A written review of your backend: what's slow, what's risky and a prioritized plan to fix it.",
    deliverables: ["API & auth review", "Query tuning", "Security check", "Prioritized fix plan"],
  },
  {
    title: "MVP backend: marketplace / SaaS API",
    price: "Starting at $6,000",
    terms: "4–6 weeks · billed in milestones (30/30/40)",
    pitch:
      "A Spring Boot API you can launch on: accounts, roles, payments and a clean data model, deployed.",
    deliverables: ["Auth & roles", "Payments", "Postgres data model", "Deployed & documented"],
  },
  {
    title: "Monthly retainer: maintenance and features",
    price: "Starting at $1,500/mo",
    terms: "Month to month",
    pitch: "A steady pair of hands each month for fixes, upgrades and new features.",
    deliverables: ["Bug fixes", "Dependency upgrades", "New features", "Monitoring"],
  },
];

/** One line under the offers: the 3D work, as a side skill. */
export const servicesNote =
  "Also available: interactive 3D and WebGL sites, like the shader work in Shadeon.";

export const skillsIntro = {
  title: "Skills",
  sub: "Mostly self-taught and hands-on: every tool here has been learned by building something with it.",
  tiers: {
    Core: "Use it daily. Ship with it confidently.",
    Comfortable: "Have shipped real work with it.",
    Exploring: "Working knowledge, growing with each project.",
  } satisfies Record<Tier, string>,
};

export const skills: SkillGroup[] = [
  {
    group: "Languages",
    items: [
      { name: "Java", tier: "Core" },
      { name: "TypeScript", tier: "Core" },
      { name: "JavaScript", tier: "Core" },
      { name: "SQL", tier: "Core" },
      { name: "Python", tier: "Comfortable" },
      { name: "Rust", tier: "Exploring" },
    ],
  },
  {
    group: "Backend",
    items: [
      { name: "Spring Boot", tier: "Core" },
      { name: "Spring Security", tier: "Core" },
      { name: "Spring Data / JPA", tier: "Core" },
      { name: "REST API design", tier: "Core" },
      { name: "Spring Cloud & microservices", tier: "Comfortable" },
      { name: "Node.js", tier: "Comfortable" },
      { name: "GraphQL", tier: "Comfortable" }, // [CONFIRM] tier
      { name: "FastAPI", tier: "Exploring" },
    ],
  },
  {
    group: "Frontend",
    items: [
      { name: "React", tier: "Core" },
      { name: "Next.js", tier: "Core" },
      { name: "Tailwind CSS", tier: "Core" },
      { name: "Three.js / WebGL / GLSL", tier: "Comfortable" },
      { name: "GSAP & motion", tier: "Comfortable" },
    ],
  },
  {
    group: "Data",
    items: [
      { name: "PostgreSQL", tier: "Core" },
      { name: "Redis", tier: "Comfortable" },
      { name: "MongoDB", tier: "Comfortable" },
      { name: "Kafka", tier: "Exploring" },
    ],
  },
  {
    group: "Cloud & DevOps",
    items: [
      { name: "Vercel", tier: "Core" },
      { name: "Docker", tier: "Comfortable" },
      { name: "GitHub Actions CI/CD", tier: "Comfortable" },
      { name: "Linux", tier: "Comfortable" },
      { name: "Render", tier: "Comfortable" },
      { name: "AWS", tier: "Exploring" },
    ],
  },
  {
    group: "Practices",
    items: [
      { name: "Auth: JWT / OAuth2", tier: "Core" },
      { name: "API design", tier: "Core" },
      { name: "Testing: JUnit, Vitest, Playwright", tier: "Comfortable" },
      { name: "Performance optimization", tier: "Comfortable" },
      { name: "Clean architecture", tier: "Comfortable" },
    ],
  },
];

export const scheduleIntro = {
  title: "How a project runs",
  sub: "From the first call to launch.",
};

export const schedule: Stage[] = [
  {
    reel: "01",
    title: "Discovery",
    film: "Development",
    body: "A call to understand the goal, the users and what “done” looks like. You get a written scope and a fixed quote.",
  },
  {
    reel: "02",
    title: "Design & architecture",
    film: "Pre-production",
    body: "Data model, system design and UI direction are agreed before a line of production code is written.",
  },
  {
    reel: "03",
    title: "The build",
    film: "Principal photography",
    body: "Built in short cuts. Every milestone lands on a live preview link you can click through yourself.",
  },
  {
    reel: "04",
    title: "Testing & hardening",
    film: "Post-production",
    body: "Automated tests, performance passes, security hardening and accessibility checks.",
  },
  {
    reel: "05",
    title: "Launch & support",
    film: "Premiere",
    body: "Launch, monitoring and a support window, then a clean handover: docs, repository and credentials.",
  },
];

export const directorsNote = {
  title: "About me",
};

export const faqIntro = {
  title: "Before you hire me",
};

export const faq: Faq[] = [
  {
    q: "How soon can you start?",
    a: "Usually within a week. I'm currently booking new freelance projects and keep only a few running at once.",
  },
  {
    q: "How do we communicate?",
    a: "Async-first: short written updates every few days, a live preview link at each milestone, and calls when they're actually useful. Email or Slack, whichever your team prefers.",
  },
  {
    // [CONFIRM] pricing model and, if you want them public, rates.
    q: "How do you price work?",
    a: "Scoped projects are priced per milestone, so you always know the cost before work starts. Ongoing work runs on an hourly or monthly retainer. Every quote is in writing.",
  },
  {
    q: "Who owns the code?",
    a: "You do. The full source, the repository and deployment access are yours from day one. No lock-in, no hostage hosting.",
  },
  {
    // [CONFIRM] length of the post-launch support window.
    q: "What happens after launch?",
    a: "Every project includes a post-launch support window for fixes. After that, ongoing changes can move to a simple monthly retainer.",
  },
  {
    q: "Can you work on my existing codebase?",
    a: "Yes. I start with a read-through and a short written report, then fix things in order of impact.",
  },
];

// ── Act V: press ─────────────────────────────────────────────────────────────

export const pressAct = {
  slate: "Act V",
  title: "Press",
  /** Shown when there are no testimonials yet. Set to "" to hide the act. */
  reserved: "",
  reservedSub: "",
};

/** [CONFIRM] Real testimonials only. Never invent these. */
export const testimonials: Testimonial[] = [];

// ── End credits / contact ────────────────────────────────────────────────────

export const credits: { role: string; names: string[] }[] = [
  { role: "Written & directed by", names: [person.name] },
  { role: "Backend", names: ["Java", "Spring Boot", "PostgreSQL"] },
  { role: "Frontend", names: ["React", "Next.js", "TypeScript"] },
  { role: "3D & shaders", names: ["Three.js", "GLSL", "Shadeon"] },
  { role: "Shipping", names: ["Docker", "GitHub Actions", "Vercel"] },
  { role: "Filmed", names: ["Remotely, for clients worldwide"] },
  { role: "Starring", names: ["Your product"] },
];

export const contactAct = {
  slate: "End credits",
  nowShowing: "Now showing",
  heading: "Start a project.",
  sub: "Tell me what you're building. I reply to every inquiry within one business day.", // [CONFIRM] response time
  formTitle: "Project brief",
  fin: "Fin.",
};

export const projectTypes = [
  "Backend audit + fix plan",
  "MVP backend: marketplace / SaaS API",
  "Monthly retainer",
  "Interactive 3D / WebGL site",
  "Something else",
] as const;

// [CONFIRM] adjust the budget brackets and currency to your market.
export const budgets = [
  "Under $1k",
  "$1k – $3k",
  "$3k – $7k",
  "$7k – $15k",
  "$15k+",
  "Not sure yet",
] as const;

export const timelines = [
  "ASAP (under 2 weeks)",
  "Within a month",
  "1 – 3 months",
  "Flexible",
] as const;

export const nav = [
  { label: "Story", href: "#problem" },
  { label: "Work", href: "#work" },
  { label: "Services", href: "#crew" },
  { label: "Contact", href: "#brief" },
] as const;
