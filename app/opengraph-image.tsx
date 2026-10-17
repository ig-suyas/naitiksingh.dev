import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { person } from "@/content/site";

export const alt = `${person.name}: ${person.subtitle}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A cinematic title card: letterboxed, one warm light, the name in serif. */
export default async function OpengraphImage() {
  const dir = join(process.cwd(), "assets", "fonts");
  const [serif, serifItalic, mono] = await Promise.all([
    readFile(join(dir, "Fraunces-600.woff")),
    readFile(join(dir, "Fraunces-300-italic.woff")),
    readFile(join(dir, "JetBrainsMono-500.woff")),
  ]);
  const bar = 66;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#000",
      }}
    >
      <div style={{ height: bar, background: "#000" }} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background:
            "radial-gradient(ellipse 70% 90% at 78% 8%, rgba(232,168,75,0.38), rgba(232,168,75,0.06) 45%, #070709 75%)",
          color: "#ece6da",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 0,
            right: 0,
            height: 2,
            background:
              "linear-gradient(90deg, transparent, rgba(127,214,220,0.4) 35%, rgba(255,240,210,0.9) 78%, rgba(127,214,220,0.3) 92%, transparent)",
          }}
        />
        <div style={{ fontFamily: "Mono", fontSize: 20, letterSpacing: 6, color: "#a39d92" }}>
          A NAITIK SINGH PRODUCTION
        </div>
        <div
          style={{
            fontFamily: "Serif",
            fontSize: 128,
            letterSpacing: 6,
            marginTop: 18,
            lineHeight: 1,
          }}
        >
          {person.name.toUpperCase()}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 28 }}>
          <div style={{ width: 70, height: 1, background: "rgba(232,168,75,0.7)" }} />
          <div style={{ width: 6, height: 6, borderRadius: 6, background: "#e8a84b" }} />
          <div style={{ width: 70, height: 1, background: "rgba(232,168,75,0.7)" }} />
        </div>
        <div style={{ fontFamily: "SerifItalic", fontSize: 38, color: "#e8a84b", marginTop: 26 }}>
          {person.subtitle}
        </div>
      </div>
      <div
        style={{
          height: bar,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          fontFamily: "Mono",
          fontSize: 16,
          letterSpacing: 4,
          color: "#6f6a62",
        }}
      >
        <span>THE FINAL CUT</span>
        <span>NOW SHOWING: YOUR PROJECT</span>
        <span>00:00:00:01</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Serif", data: serif, weight: 600, style: "normal" },
        { name: "SerifItalic", data: serifItalic, weight: 300, style: "italic" },
        { name: "Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
