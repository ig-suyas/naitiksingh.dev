"use client";

import {
  Component,
  useCallback,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { director, type Tier } from "@/lib/director";
import { detectTier } from "@/lib/device";
import { loading } from "@/lib/loading";
import { whenIdle } from "@/lib/idle";
import { NodeLabels } from "./NodeLabels";
import type { ExperienceProps } from "./Experience";

/** The 2D film is its own chunk: desktops that get 3D never download it. */
const Fallback2D = dynamic(
  () => import("@/components/fallback/Fallback2D").then((m) => m.Fallback2D),
  {
    ssr: false,
  },
);

class Boundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Mode = "pending" | "3d" | "2d";

/**
 * The projection booth. Decides what this device can show (3D or the 2D
 * fallback), lazy-loads the WebGL chunk, and falls back on any failure.
 */
export function Stage() {
  const [mode, setMode] = useState<Mode>("pending");
  const [tier, setTier] = useState<Tier>("high");
  const [Exp, setExp] = useState<ComponentType<ExperienceProps> | null>(null);
  const [ready, setReady] = useState(false);
  const [fallbackGone, setFallbackGone] = useState(false);

  const fail = useCallback(() => {
    loading.remove("3d");
    setMode("2d");
    setFallbackGone(false);
  }, []);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    let cancelled = false;
    let teardown = () => {};
    const begin = () => {
      if (cancelled) return;
      teardown = start();
    };
    // Phones: the leader covers the stage for ~2 s anyway, so probing WebGL and
    // mounting the 2D film wait until the page is idle, after first paint.
    const phone = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
    if (phone && !new URLSearchParams(window.location.search).has("3d"))
      void whenIdle().then(begin);
    else begin();
    return () => {
      cancelled = true;
      teardown();
    };

    function start(): () => void {
      const detected = detectTier();
      director.tier = detected.tier;
      document.documentElement.dataset.tier = detected.tier;
      setTier(detected.tier);
      if (detected.tier === "low") {
        setMode("2d");
        return () => {};
      }

      const load = () => {
        if (cancelled) return;
        import("./Experience")
          .then((mod) => {
            if (cancelled) return;
            loading.progress("3d", 0.4);
            setExp(() => mod.default);
            setMode("3d");
          })
          .catch(() => !cancelled && fail());
      };

      if (detected.tier === "high") {
        // Desktop: the leader waits for the 3D, so the film starts complete.
        loading.add("3d", 4);
        load();
        return () => {};
      }

      // Phones & modest devices: show the 2D film first and bring the 3D in once
      // the visitor engages or the page has settled.
      const events = ["pointerdown", "touchstart", "wheel", "keydown"] as const;
      let timer = 0;
      const go = () => {
        cleanup();
        load();
      };
      const cleanup = () => {
        events.forEach((e) => window.removeEventListener(e, go));
        window.clearTimeout(timer);
      };
      events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
      const arm = () => (timer = window.setTimeout(go, 6500));
      if (document.readyState === "complete") arm();
      else window.addEventListener("load", arm, { once: true });
      return () => {
        cleanup();
        window.removeEventListener("load", arm);
      };
    }
  }, [fail]);

  // Retire the fallback once the 3D has faded in over it.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setFallbackGone(true), 1200);
    return () => window.clearTimeout(t);
  }, [ready]);

  const showFallback = mode === "2d" || (tier !== "high" && !fallbackGone);

  return (
    <div id="stage" className="stage" aria-hidden="true">
      {showFallback && (
        <div className="stage-layer" style={{ opacity: mode === "3d" && ready ? 0 : 1 }}>
          <Fallback2D />
        </div>
      )}
      {mode === "3d" && Exp && (
        <div className="stage-layer" style={{ opacity: ready ? 1 : 0 }}>
          <Boundary onError={fail}>
            <Exp tier={tier} onReady={onReady} onFail={fail} />
          </Boundary>
          <NodeLabels />
        </div>
      )}
    </div>
  );
}
