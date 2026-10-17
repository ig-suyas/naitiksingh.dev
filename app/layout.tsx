import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import { person, site } from "@/content/site";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

/*
 * Font budget (~100 KB): every web font that swaps in re-lays-out the whole
 * page, which is expensive on phones. So only the display serif swaps; the
 * mono labels use `optional` (no late swap), and body copy uses the system UI
 * stack. Fraunces ships without the opsz axis, which halves its weight.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400"],
  display: "optional",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: site.title,
  description: site.description,
  keywords: site.keywords,
  authors: [{ name: person.name, url: person.github }],
  creator: person.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: person.name,
    title: site.title,
    description: site.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#06060a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/**
 * Runs before first paint: returning visitors (same tab session) and
 * reduced-motion users get a short leader; everyone starts scroll-locked
 * until the leader finishes.
 */
const bootScript = `(function(){try{var d=document.documentElement;if(location.pathname==='/')d.classList.add('is-loading');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('js-reveal');if(sessionStorage.getItem('seen-leader'))d.classList.add('leader-fast');if(location.hash)d.classList.add('has-hash');if('scrollRestoration' in history)history.scrollRestoration='manual';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <noscript>
          <style>{`html.is-loading{overflow:auto}.leader{display:none!important}.title-card{opacity:1!important}`}</style>
        </noscript>
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
