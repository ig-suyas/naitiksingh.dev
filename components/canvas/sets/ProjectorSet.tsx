"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { director, type Tier } from "@/lib/director";
import { clamp, easeInOutCubic, lerp } from "@/lib/math";
import type { RigFn } from "../registry";
import { useSet } from "../useSet";
import { Beam, createBeamMaterial } from "../parts/Beam";
import { Dust, type BeamInfo } from "../parts/Dust";
import { Flare } from "../parts/Flare";

/** The projector port in the back wall, and where its beam lands. */
const LENS = new Vector3(3.6, 2.35, -7.9);
const BEAM_TARGET = new Vector3(-6.2, -3.8, 8.5);
const BEAMS: BeamInfo[] = [{ origin: LENS, target: BEAM_TARGET, radius: 2.6 }];
const DUST_SIZE: [number, number, number] = [16, 10, 18];
const DUST_CENTER: [number, number, number] = [0, 0, 0];

/** Stepped flicker that matches the CSS "light strike" on the title card. */
const STRIKE: [number, number][] = [
  [0, 0.04],
  [0.19, 0.85],
  [0.26, 0.1],
  [0.48, 0.9],
  [0.54, 0.3],
  [0.67, 1],
  [0.77, 0.6],
  [0.9, 1],
];

export function lightLevel(now: number) {
  if (director.reducedMotion) return 1;
  if (!director.introDone) return 0.04;
  const t = now - director.introAt;
  let v = 1;
  if (t < 0.9) for (const [k, val] of STRIKE) if (t >= k) v = val;
  return v * (0.965 + 0.035 * Math.sin(now * 151) * Math.sin(now * 37));
}

const tmp = new Vector3();
const rig: RigFn = (t, shot, aspect, rm) => {
  const p = rm ? 0.15 : t;
  const fit = aspect < 1 ? 1.35 : 1;
  const a = easeInOutCubic(clamp(p / 0.72));
  const rush = Math.pow(clamp((p - 0.58) / 0.42), 2.3);
  shot.pos.set(lerp(0, 0.7, a), lerp(0.05, 0.45, a), lerp(9.5 * fit, 6.2, a));
  shot.pos.lerp(tmp.set(2.85, 1.9, -4.4), rush);
  shot.look.set(lerp(0, 0.9, a), lerp(0, 0.55, a), 0).lerp(LENS, rush);
  shot.fov = lerp(38, 48, rush);
};

const wallGeo = new PlaneGeometry(40, 22);

/** Cold open: a dark booth wall, one projector port, a dusty beam and an anamorphic flare. */
export function ProjectorSet({ tier }: { tier: Tier }) {
  const ref = useSet("projector", rig);

  const beam = useMemo(() => createBeamMaterial("#ffcf8a"), []);
  const wall = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uLens: { value: LENS },
          uIntensity: { value: 0 },
          uColor: { value: new Color("#e8a84b") },
        },
        vertexShader: /* glsl */ `
          varying vec3 vW;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uLens;
          uniform float uIntensity;
          uniform vec3 uColor;
          varying vec3 vW;
          void main() {
            vec2 d = vW.xy - uLens.xy;
            float r = length(d * vec2(0.75, 1.0));
            float spill = exp(-r * 0.5) * 0.16 + exp(-r * 2.2) * 0.5;
            vec2 q = abs(d) - vec2(0.95, 0.55);
            float box = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
            float window = 1.0 - smoothstep(0.0, 0.05, box);
            float frame = 1.0 - smoothstep(0.0, 0.035, abs(box - 0.07));
            float panels = 0.82 + 0.18 * step(0.5, fract(vW.x * 0.42));
            vec3 col = vec3(0.010, 0.009, 0.011);
            col += uColor * spill * uIntensity * 0.55 * panels;
            col += uColor * window * uIntensity * 0.28;
            col += uColor * frame * uIntensity * 0.25;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  );

  useFrame((state) => {
    if (!ref.current?.visible) return;
    const now = performance.now() / 1000;
    const L = lightLevel(now);
    beam.uniforms.uIntensity!.value = L;
    beam.uniforms.uTime!.value = director.reducedMotion ? 4 : state.clock.elapsedTime;
    wall.uniforms.uIntensity!.value = L;
  });

  const level = () => lightLevel(performance.now() / 1000);

  return (
    <group ref={ref} userData={{ set: true }}>
      <mesh geometry={wallGeo} material={wall} position={[0, 0, -8]} renderOrder={0} />
      <Beam origin={LENS} target={BEAM_TARGET} radius={2.6} material={beam} />
      <Dust
        count={tier === "high" ? 1600 : 650}
        size={DUST_SIZE}
        center={DUST_CENTER}
        beams={BEAMS}
        ambient={0.035}
        intensity={level}
      />
      <Flare position={LENS} intensity={level} />
    </group>
  );
}
