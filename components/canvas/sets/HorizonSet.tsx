"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { director, type Tier } from "@/lib/director";
import { clamp, damp, smoothstep } from "@/lib/math";
import type { RigFn } from "../registry";
import { useSet } from "../useSet";
import { FULLSCREEN_VERT, NOISE2 } from "../shaders/chunks";

const quad = new PlaneGeometry(2, 2);

const rig: RigFn = (_t, shot) => {
  shot.pos.set(0, 0, 9);
  shot.look.set(0, 0, 0);
  shot.fov = 40;
};

/**
 * End credits: an event horizon (a nod to Shadeon's shader of the same name).
 * A lensed starfield, an amber accretion disk and the far side of the disk
 * bent up over the hole.
 */
export function HorizonSet({ tier }: { tier: Tier }) {
  const ref = useSet("horizon", rig);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        defines: { OCTAVES: tier === "high" ? 5 : 4 },
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 1 },
          uProgress: { value: 0 },
          uRes: { value: new Vector2(1, 1) },
          uPointer: { value: new Vector2(0, 0) },
          uCenter: { value: new Vector2(0, 0.06) },
          uAmber: { value: new Color("#e8853a") },
          uHot: { value: new Color("#ffd9a0") },
        },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uIntensity;
          uniform float uProgress;
          uniform vec2 uRes;
          uniform vec2 uPointer;
          uniform vec2 uCenter;
          uniform vec3 uAmber;
          uniform vec3 uHot;
          ${NOISE2}

          vec3 stars(vec2 p) {
            vec3 c = vec3(0.0);
            for (int i = 0; i < 2; i++) {
              float sc = i == 0 ? 34.0 : 82.0;
              vec2 g = p * sc;
              vec2 id = floor(g);
              vec2 f = fract(g) - 0.5;
              float h = hash12(id + float(i) * 19.7);
              if (h > 0.9) {
                vec2 o = vec2(hash12(id + 3.1), hash12(id + 7.7)) - 0.5;
                float d = length(f - o * 0.6);
                float b = smoothstep(0.09, 0.0, d) * (h - 0.9) * 10.0;
                c += mix(vec3(0.55, 0.75, 1.0), vec3(1.0, 0.85, 0.6), hash12(id + 1.3)) * b;
              }
            }
            return c;
          }

          void main() {
            vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
            vec2 c = uCenter + uPointer * 0.015;
            vec2 d = p - c;
            float r = max(length(d), 1e-4);
            float rs = 0.12 * (1.0 + uProgress * 0.3);

            // Background starfield, bent around the hole.
            vec2 lp = p - (d / r) * (rs * rs * 1.6 / r);
            vec3 col = stars(lp + vec2(uTime * 0.003, 0.0)) * 0.7;

            // Accretion disk, tilted towards us.
            vec2 dd = vec2(d.x, d.y / 0.17);
            float rd = max(length(dd), 1e-4);
            float inner = rs * 1.55;
            float outer = rs * 4.4;
            float band = smoothstep(inner, inner * 1.12, rd) * (1.0 - smoothstep(outer * 0.5, outer, rd));
            vec2 sw = rot2(-uTime * 0.25 * (rs / max(rd, rs))) * dd / rs;
            float swirl = fbm(sw * 1.7 + 3.0);
            float doppler = 1.0 - 0.55 * (dd.x / rd);
            vec3 diskCol = mix(uAmber, uHot, smoothstep(outer * 0.6, inner, rd));
            vec3 disk = diskCol * band * (0.22 + 1.4 * swirl * swirl) * doppler;

            // Far side of the disk, lensed into a halo over the top of the hole.
            float ka = (r - rs * 1.32) / (rs * 0.2);
            float arc = exp(-ka * ka);
            vec2 sa = rot2(-uTime * 0.3) * d / rs;
            float halo = arc * (0.35 + 0.9 * fbm(sa * 2.4 + 9.0));
            float upper = smoothstep(-0.35, 0.55, d.y / r);
            vec3 haloCol = diskCol * halo * mix(0.3, 1.0, upper);

            float kp = (r - rs * 1.04) / (rs * 0.03);
            float photon = exp(-kp * kp);
            float hole = smoothstep(rs * 0.97, rs * 1.01, r);
            col = col * hole + haloCol * hole + uHot * photon * 1.3;
            float front = 1.0 - smoothstep(-0.015, 0.015, d.y);
            col += disk * mix(hole, 1.0, front);
            col += uAmber * exp(-r * 3.2) * 0.05;
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
    const p = clamp(director.T - 6);
    const aspect = size.width / size.height;
    u.uTime!.value = director.reducedMotion ? 20 : state.clock.elapsedTime;
    u.uProgress!.value = p;
    (u.uRes!.value as Vector2).set(size.width * dpr, size.height * dpr);
    // Centred behind the credits, then it drifts up and dims behind the brief.
    const lift = smoothstep(0.35, 0.8, p);
    const c = u.uCenter!.value as Vector2;
    c.set(aspect > 1 ? lift * 0.18 * aspect : 0, 0.06 + lift * 0.26);
    u.uIntensity!.value = 1 - lift * 0.45;
    const ptr = u.uPointer!.value as Vector2;
    ptr.x = damp(ptr.x, director.pointer.x, 2, dt);
    ptr.y = damp(ptr.y, director.pointer.y, 2, dt);
  });

  return (
    <group ref={ref} userData={{ set: true }}>
      <mesh geometry={quad} material={material} frustumCulled={false} renderOrder={-10} />
    </group>
  );
}
