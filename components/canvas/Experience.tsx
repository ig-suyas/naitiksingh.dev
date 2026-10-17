"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { DefaultLoadingManager } from "three";
import { director, type Tier } from "@/lib/director";
import { loading } from "@/lib/loading";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { ProjectorSet } from "./sets/ProjectorSet";
import { SystemSet } from "./sets/SystemSet";
import { ScreeningSet } from "./sets/ScreeningSet";
import { FogSet } from "./sets/FogSet";
import { HorizonSet } from "./sets/HorizonSet";

export interface ExperienceProps {
  tier: Tier;
  onReady: () => void;
  onFail: () => void;
}

/** Pre-compiles every set's shaders once, so no cut ever hitches. */
function Compile({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let alive = true;
    director.compiling = true;
    const id = requestAnimationFrame(async () => {
      scene.traverse((o) => (o.visible = true));
      try {
        await gl.compileAsync(scene, camera);
      } catch {
        /* compile lazily on first draw instead */
      }
      director.compiling = false;
      loading.done("3d");
      if (alive) onReady();
    });
    return () => {
      alive = false;
      cancelAnimationFrame(id);
      director.compiling = false;
    };
  }, [gl, scene, camera, onReady]);

  return null;
}

/** Stop drawing entirely while the tab is hidden. */
function PauseWhenHidden() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const onChange = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [setFrameloop]);
  return null;
}

export default function Experience({ tier, onReady, onFail }: ExperienceProps) {
  const maxDpr = tier === "high" ? 2 : 1.5;
  const [dpr, setDpr] = useState(() => Math.min(maxDpr, window.devicePixelRatio || 1));

  useEffect(() => {
    DefaultLoadingManager.onProgress = (_url, loaded, total) =>
      loading.progress("3d", 0.4 + 0.4 * (loaded / Math.max(1, total)));
    return () => {
      DefaultLoadingManager.onProgress = () => {};
    };
  }, []);

  return (
    <Canvas
      dpr={dpr}
      flat
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        depth: true,
        powerPreference: "high-performance",
      }}
      camera={{ fov: 38, near: 0.1, far: 120, position: [0, 0.1, 9.5] }}
      onCreated={(state) => {
        const { gl } = state;
        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { __r3f: typeof state }).__r3f = state;
        }
        gl.setClearColor("#040406", 1);
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            onFail();
          },
          { once: true },
        );
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr((d) => Math.max(1, +(d * 0.8).toFixed(2)))}
        onFallback={() => setDpr(1)}
      />
      <Suspense fallback={null}>
        <ProjectorSet tier={tier} />
        <SystemSet tier={tier} />
        <ScreeningSet tier={tier} />
        <FogSet tier={tier} />
        <HorizonSet tier={tier} />
        <CameraRig />
        <Effects tier={tier} />
        <Compile onReady={onReady} />
      </Suspense>
      <PauseWhenHidden />
    </Canvas>
  );
}
