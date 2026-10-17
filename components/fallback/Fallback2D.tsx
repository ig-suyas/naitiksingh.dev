"use client";

import { useEffect, useMemo, useRef } from "react";
import { architecture } from "@/content/site";
import { buildMorph, setAt, type SetId } from "@/lib/acts";
import { subscribe } from "@/lib/director";
import { clamp, mulberry32, smoothstep } from "@/lib/math";

const LAYERS: SetId[] = ["projector", "system", "screening", "fog", "horizon"];

/** Smooth SVG path through points (midpoint quadratic curves). */
function smoothPath(pts: [number, number][]) {
  let d = `M${pts[0]![0].toFixed(2)} ${pts[0]![1].toFixed(2)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]!;
    const [nx, ny] = pts[i + 1]!;
    d += ` Q${x.toFixed(2)} ${y.toFixed(2)} ${((x + nx) / 2).toFixed(2)} ${((y + ny) / 2).toFixed(2)}`;
  }
  const last = pts[pts.length - 1]!;
  return `${d} L${last[0].toFixed(2)} ${last[1].toFixed(2)}`;
}

function useTangle() {
  return useMemo(() => {
    const rand = mulberry32(42);
    return Array.from({ length: 26 }, () => {
      const pts: [number, number][] = [];
      let x = (rand() - 0.5) * 6;
      let y = (rand() - 0.5) * 5;
      for (let k = 0; k < 8; k++) {
        pts.push([x, y]);
        x = clamp(x + (rand() - 0.5) * 3.4, -3.6, 3.6);
        y = clamp(y + (rand() - 0.5) * 3, -2.9, 2.9);
      }
      return { d: smoothPath(pts), err: rand() > 0.85 };
    });
  }, []);
}

const NODE = Object.fromEntries(architecture.nodes.map((n) => [n.id, n]));

function edgePath(a: string, b: string) {
  const A = NODE[a]!;
  const B = NODE[b]!;
  const down = B.pos[1] < A.pos[1];
  const sy = -(A.pos[1] + (down ? -A.size[1] / 2 : A.size[1] / 2));
  const ey = -(B.pos[1] + (down ? B.size[1] / 2 : -B.size[1] / 2));
  const mid = (sy + ey) / 2;
  return `M${A.pos[0]} ${sy} V${mid} H${B.pos[0]} V${ey}`;
}

/** Deterministic dust for the CSS projector beam. */
function useMotes(n: number) {
  return useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: n }, () => {
      const t = rand();
      return {
        left: 78 - t * 70 + (rand() - 0.5) * 18 * t,
        top: 22 + t * 66 + (rand() - 0.5) * 18 * t,
        size: 1 + rand() * 2.2,
      };
    });
  }, [n]);
}

/**
 * The cinematic 2D cut for devices without (good) WebGL: the same acts told
 * with CSS light, SVG cables that draw themselves, and parallax.
 */
export function Fallback2D() {
  const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tangleRef = useRef<SVGGElement>(null);
  const archRef = useRef<SVGGElement>(null);
  const tangle = useTangle();
  const motes = useMotes(34);

  useEffect(() => {
    let last: SetId | "" = "";
    let lastM = -1;
    let lastParallax = "";
    return subscribe((d) => {
      const set = setAt(d.T).id;
      if (set !== last) {
        LAYERS.forEach((id) => {
          const el = layerRefs.current[id];
          if (el) el.style.opacity = id === set ? "1" : "0";
        });
        last = set;
      }
      if (!d.reducedMotion) {
        // Parallax eases via a CSS transition (see .fallback in globals.css), so
        // it only needs a write when the pointer actually moves.
        const t = `translate3d(${(-d.pointer.x * 14).toFixed(0)}px, ${(d.pointer.y * 10).toFixed(0)}px, 0) scale(1.04)`;
        const inner = layerRefs.current[set]?.firstElementChild as HTMLElement | null;
        if (inner && t !== lastParallax) {
          inner.style.transform = t;
          lastParallax = t;
        }
      }
      const m = d.reducedMotion ? (d.T >= 2 ? 1 : 0) : buildMorph(d.T);
      if (Math.abs(m - lastM) > 0.002) {
        lastM = m;
        if (tangleRef.current) tangleRef.current.style.opacity = String(1 - smoothstep(0, 0.6, m));
        archRef.current?.querySelectorAll<SVGElement>("[data-draw]").forEach((el, i) => {
          const k = smoothstep(0.05 + i * 0.03, 0.55 + i * 0.03, m);
          el.style.strokeDashoffset = String(1 - k);
        });
        archRef.current?.querySelectorAll<SVGElement>("[data-node]").forEach((el, i) => {
          el.style.opacity = String(smoothstep(0.1 + i * 0.06, 0.35 + i * 0.06, m));
        });
      }
    });
  }, []);

  const setRef = (id: SetId) => (el: HTMLDivElement | null) => {
    layerRefs.current[id] = el;
  };

  return (
    <div className="fallback absolute inset-0 overflow-hidden">
      {/* Cold open: projector beam */}
      <div ref={setRef("projector")} className="stage-layer" style={{ opacity: 1 }}>
        <div className="absolute inset-[-4%]">
          <svg
            className="fb-beam absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="fb-beam-g" x1="78%" y1="22%" x2="0%" y2="100%">
                <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.55" />
                <stop offset="0.6" stopColor="#e8a84b" stopOpacity="0.12" />
                <stop offset="1" stopColor="#e8a84b" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points="78,22 -8,64 18,118" fill="url(#fb-beam-g)" />
          </svg>
          <div className="fb-lens" style={{ left: "78%", top: "22%" }} />
          <div className="fb-streak" style={{ top: "22%" }} />
          <div className="fb-motes">
            {motes.map((m, i) => (
              <span
                key={i}
                className="fb-mote"
                style={{
                  left: `${m.left}%`,
                  top: `${m.top}%`,
                  width: m.size,
                  height: m.size,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Acts I–II: tangle → architecture */}
      <div ref={setRef("system")} className="stage-layer" style={{ opacity: 0 }}>
        <div className="absolute inset-0">
          <div className="fb-system absolute">
            <svg
              className="h-full w-full"
              viewBox="-4.2 -4.1 8.4 8.2"
              preserveAspectRatio="xMidYMid meet"
            >
              <g ref={tangleRef} className="fb-tangle">
                {tangle.map((t, i) => (
                  <path key={i} d={t.d} className={t.err ? "err" : undefined} />
                ))}
              </g>
              <g ref={archRef}>
                {architecture.edges.map(([a, b]) => (
                  <path
                    key={`${a}-${b}`}
                    data-draw
                    d={edgePath(a, b)}
                    pathLength={1}
                    className="fb-edge"
                  />
                ))}
                <path data-draw d="M-3.7 3.35 H3.7" pathLength={1} className="fb-edge teal" />
                {architecture.nodes.map((n) => (
                  <g key={n.id} data-node style={{ opacity: 0 }}>
                    <rect
                      x={n.pos[0] - n.size[0] / 2}
                      y={-n.pos[1] - n.size[1] / 2}
                      width={n.size[0]}
                      height={n.size[1]}
                      rx={0.04}
                      className="fb-node"
                    />
                    <text
                      x={n.pos[0] - n.size[0] / 2 + 0.08}
                      y={-n.pos[1] + 0.05}
                      className="fb-label"
                    >
                      {n.label}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Act III: screening room glow */}
      <div ref={setRef("screening")} className="stage-layer" style={{ opacity: 0 }}>
        <div className="absolute inset-0">
          <div className="fb-screen" style={{ left: "10%", top: "24%" }} />
          <div className="fb-screen teal" style={{ right: "10%", top: "30%" }} />
          <div className="fb-rows" />
        </div>
      </div>

      {/* Acts IV–V: fog */}
      <div ref={setRef("fog")} className="stage-layer" style={{ opacity: 0 }}>
        <div className="absolute inset-0">
          <div className="fb-fogs">
            <div className="fb-fog a" />
            <div className="fb-fog b" />
            <div className="fb-fog c" />
          </div>
        </div>
      </div>

      {/* End credits: event horizon */}
      <div ref={setRef("horizon")} className="stage-layer" style={{ opacity: 0 }}>
        <div className="absolute inset-0">
          <div className="fb-bh">
            <div className="fb-disk" />
            <div className="fb-hole" />
            <div className="fb-disk front" />
          </div>
        </div>
      </div>
    </div>
  );
}
