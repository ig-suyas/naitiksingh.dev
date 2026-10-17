"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  Sphere,
  Vector3,
  type Points,
} from "three";
import { director } from "@/lib/director";
import { mulberry32 } from "@/lib/math";

export interface BeamInfo {
  origin: Vector3;
  target: Vector3;
  radius: number;
}

/**
 * Floating dust motes. Each mote is faint on its own and glows only while it
 * drifts through one of the given light beams.
 */
export function Dust({
  count,
  size,
  center = [0, 0, 0],
  beams = [],
  ambient = 0.05,
  color = "#ffe1b8",
  pointSize = 34,
  seed = 3,
  intensity,
}: {
  count: number;
  size: [number, number, number];
  center?: [number, number, number];
  beams?: BeamInfo[];
  ambient?: number;
  color?: string;
  pointSize?: number;
  seed?: number;
  /** Read every frame; lets the parent flicker the light. */
  intensity?: () => number;
}) {
  const ref = useRef<Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const rand = mulberry32(seed);
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = center[0] + (rand() - 0.5) * size[0];
      pos[i * 3 + 1] = center[1] + (rand() - 0.5) * size[1];
      pos[i * 3 + 2] = center[2] + (rand() - 0.5) * size[2];
      seeds[i] = rand();
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    g.boundingSphere = new Sphere(new Vector3(...center), Math.hypot(...size));
    return g;
  }, [count, size, center, seed]);

  const material = useMemo(() => {
    const origins = [new Vector3(), new Vector3()];
    const dirs = [new Vector3(0, -1, 0), new Vector3(0, -1, 0)];
    const lens = [1, 1];
    const radii = [1, 1];
    beams.slice(0, 2).forEach((b, i) => {
      origins[i]!.copy(b.origin);
      const d = new Vector3().subVectors(b.target, b.origin);
      lens[i] = d.length();
      dirs[i]!.copy(d.normalize());
      radii[i] = b.radius;
    });
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: pointSize },
        uPixelRatio: { value: 1 },
        uIntensity: { value: 1 },
        uAmbient: { value: ambient },
        uColor: { value: new Color(color) },
        uBeamCount: { value: Math.min(2, beams.length) },
        uBeamO: { value: origins },
        uBeamD: { value: dirs },
        uBeamL: { value: lens },
        uBeamR: { value: radii },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uSize;
        uniform float uPixelRatio;
        uniform float uIntensity;
        uniform float uAmbient;
        uniform int uBeamCount;
        uniform vec3 uBeamO[2];
        uniform vec3 uBeamD[2];
        uniform float uBeamL[2];
        uniform float uBeamR[2];
        varying float vLit;
        void main() {
          float s = aSeed * 6.2831;
          vec3 p = position + vec3(
            sin(uTime * 0.13 + s * 3.0),
            sin(uTime * 0.09 + s * 5.0) * 1.2,
            cos(uTime * 0.11 + s * 2.0)) * 0.3;
          vec4 world = modelMatrix * vec4(p, 1.0);
          float lit = 0.0;
          for (int i = 0; i < 2; i++) {
            if (i >= uBeamCount) break;
            vec3 rel = world.xyz - uBeamO[i];
            float along = dot(rel, uBeamD[i]);
            float t = clamp(along / uBeamL[i], 0.0, 1.0);
            float r = length(rel - uBeamD[i] * along);
            float radius = mix(0.08, uBeamR[i], t);
            float inside = 1.0 - smoothstep(radius * 0.3, radius, r);
            lit += inside * (1.0 - t * 0.7) * step(0.0, along) * step(along, uBeamL[i]);
          }
          float twinkle = 0.55 + 0.45 * sin(uTime * (1.3 + aSeed * 2.0) + s * 7.0);
          vLit = (min(lit, 1.0) * uIntensity * 1.7 + uAmbient) * twinkle;
          vec4 mv = viewMatrix * world;
          gl_PointSize = uSize * uPixelRatio * (0.3 + aSeed * 0.9) / max(0.2, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vLit;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(uColor * a * a * vLit, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  }, [beams, ambient, color, pointSize]);

  useFrame((state) => {
    const p = ref.current;
    if (!p || !p.parent?.visible) return;
    const u = material.uniforms;
    u.uTime!.value = director.reducedMotion ? 6 : state.clock.elapsedTime;
    u.uPixelRatio!.value = dpr;
    if (intensity) u.uIntensity!.value = intensity();
  });

  return <points ref={ref} geometry={geometry} material={material} renderOrder={6} />;
}
