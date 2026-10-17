import { person, projects, services, site, skills } from "@/content/site";
import { siteUrl } from "@/lib/site-url";
import { Director } from "@/components/film/Director";
import { Leader } from "@/components/film/Leader";
import { FilmOverlays } from "@/components/film/FilmOverlays";
import { Hud } from "@/components/film/Hud";
import { Cursor } from "@/components/film/Cursor";
import { RevealObserver } from "@/components/film/RevealObserver";
import { Stage } from "@/components/canvas/Stage";
import { Nav } from "@/components/ui/Nav";
import { ColdOpen } from "@/components/sections/ColdOpen";
import { ProblemAct } from "@/components/sections/ProblemAct";
import { BuildAct } from "@/components/sections/BuildAct";
import { ProofAct } from "@/components/sections/ProofAct";
import { CrewAct } from "@/components/sections/CrewAct";
import { PressAct } from "@/components/sections/PressAct";
import { EndCredits } from "@/components/sections/EndCredits";
import { Footer } from "@/components/sections/Footer";

function JsonLd() {
  const url = siteUrl();
  const sameAs = [person.github, person.linkedin, ...person.otherSocials.map((s) => s.href)].filter(
    Boolean,
  );
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${url}/#person`,
        name: person.name,
        url,
        email: `mailto:${person.email}`,
        jobTitle: person.role,
        description: person.bio.join(" "),
        sameAs,
        knowsAbout: skills.flatMap((g) => g.items.map((i) => i.name)),
        ...(person.location ? { homeLocation: { "@type": "Place", name: person.location } } : {}),
      },
      {
        "@type": "ProfessionalService",
        "@id": `${url}/#service`,
        name: `${person.name}, full-stack engineering`,
        url,
        description: site.description,
        image: `${url}/opengraph-image`,
        email: person.email,
        founder: { "@id": `${url}/#person` },
        areaServed: "Worldwide",
        serviceType: services.map((s) => s.title),
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Freelance services",
          itemListElement: services.map((s) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: s.title, description: s.pitch },
          })),
        },
      },
      ...projects.map((p) => ({
        "@type": "CreativeWork",
        name: p.title,
        description: p.logline,
        url: p.live,
        creator: { "@id": `${url}/#person` },
        keywords: p.stack.join(", "),
      })),
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default function Home() {
  return (
    <>
      <Director />
      <Leader />
      <Stage />
      <FilmOverlays />
      <Nav />
      <main id="main" className="relative z-10">
        <ColdOpen />
        <ProblemAct />
        <BuildAct />
        <ProofAct />
        <CrewAct />
        <PressAct />
        <EndCredits />
      </main>
      <Footer />
      <Hud />
      <Cursor />
      <RevealObserver />
      <JsonLd />
    </>
  );
}
