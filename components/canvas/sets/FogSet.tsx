"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { director, type Tier } from "@/lib/director";
import { damp } from "@/lib/math";
import type { RigFn } from "../registry";
import { useSet } from "../useSet";
import { FULLSCREEN_VERT, NOISE2 } from "../shaders/chunks";
import { Dust } from "../parts/Dust";

const quad = new PlaneGeometry(2, 2);
const DUST_SIZE: [number, number, number] = [18, 12, 10];
const DUST_CENTER: [number, number, number] = [0, 0, 0];

const rig: RigFn = (t, shot, _aspect, rm) => {
  const p = rm ? 0.5 : t;
  shot.pos.set(Math.sin(p * 0.6) * 0.8, 0.2 - p * 0.3, 9);
  shot.look.set(0, -p * 0.4, 0);
  shot.fov = 40;
};

/**
 * Acts IV–V: Shadeon-style rolling fog behind the call sheet. Full-screen
 * fbm, warm key light top-right, cold fill bottom-left, the pointer wipes it thin.
 */
export function FogSet({ tier }: { tier: Tier }) {
  const ref = useSet("fog", rig);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        defines: { OCTAVES: tier === "high" ? 5 : 4 },
        uniforms: {
          uTime: { value: 0 },
          uScroll: { value: 0 },
          uIntensity: { value: 1 },
          uRes: { value: new Vector2(1, 1) },
          uPointer: { value: new Vector2(0, 0) },
          uAmber: { value: new Color("#e8a84b") },
          uTeal: { value: new Color("#5ec8d0") },
        },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uScroll;
          uniform float uIntensity;
          uniform vec2 uRes;
          uniform vec2 uPointer;
          uniform vec3 uAmber;
          uniform vec3 uTeal;
          ${NOISE2}
          void main() {
            vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
            float t = uTime * 0.035;
            vec2 drift = vec2(t, -t * 0.4) + vec2(0.0, uScroll * 0.35);
            vec2 q = vec2(fbm(p * 1.4 + drift), fbm(p * 1.4 - drift.yx + 5.2));
            float f = fbm(p * 2.0 + q * 1.7 + drift * 0.5);
            float key = smoothstep(-0.9, 1.1, p.x * 0.8 + p.y);
            float fill = smoothstep(1.0, -1.0, p.x + p.y * 0.4);
            vec3 col = vec3(0.005, 0.005, 0.008);
            col += uAmber * pow(max(f, 0.0), 2.4) * key * 0.62;
            col += uTeal * pow(max(q.y, 0.0), 3.0) * fill * 0.2;
            float d = length(p - uPointer);
            col *= mix(0.45, 1.0, smoothstep(0.04, 0.55, d));
            gl_FragColor = vec4(col * uIntensity, 1.0);
          }
        `,
        depthTest: false,
        depthWrite: false,
      }),
    [tier],
  );

  useFrame((state, dt) => {
    if (!ref.current?.visible) return;
    const u = material.uniforms;
    u.uTime!.value = director.reducedMotion ? 12 : state.clock.elapsedTime;
    u.uScroll!.value = director.T - 4;
    u.uIntensity!.value = 0.8;
    (u.uRes!.value as Vector2).set(size.width * dpr, size.height * dpr);
    const aspect = size.width / size.height;
    const ptr = u.uPointer!.value as Vector2;
    ptr.x = damp(ptr.x, director.pointer.x * aspect * 0.5, 2.2, dt);
    ptr.y = damp(ptr.y, director.pointer.y * 0.5, 2.2, dt);
  });

  return (
    <group ref={ref} userData={{ set: true }}>
      <mesh geometry={quad} material={material} frustumCulled={false} renderOrder={-10} />
      <Dust
        count={tier === "high" ? 500 : 220}
        size={DUST_SIZE}
        center={DUST_CENTER}
        ambient={0.12}
        pointSize={24}
        seed={31}
      />
    </group>
  );
}
