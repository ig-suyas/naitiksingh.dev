"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  PlaneGeometry,
  ShaderMaterial,
  type Mesh,
  type Vector3,
} from "three";

const W = 10;
const H = 1.3;
const geometry = new PlaneGeometry(1, 1);

/** Anamorphic lens flare: a hot core and a long horizontal streak. Always faces the camera. */
export function Flare({
  position,
  intensity,
  core = "#fff1d6",
  streak = "#7fd6dc",
  scale = 1,
}: {
  position: Vector3;
  intensity: () => number;
  core?: string;
  streak?: string;
  scale?: number;
}) {
  const ref = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uIntensity: { value: 1 },
          uAspect: { value: W / H },
          uCore: { value: new Color(core) },
          uStreak: { value: new Color(streak) },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uIntensity;
          uniform float uAspect;
          uniform vec3 uCore;
          uniform vec3 uStreak;
          varying vec2 vUv;
          void main() {
            vec2 q = vUv * 2.0 - 1.0;
            vec2 p = vec2(q.x * uAspect, q.y);
            float r = length(p);
            float core = exp(-r * r * 16.0) * 2.6 + exp(-r * 3.2) * 0.3;
            float fall = pow(max(0.0, 1.0 - abs(q.x)), 2.2);
            float streak = exp(-abs(q.y) * 14.0) * fall * 0.45;
            float thin = exp(-abs(q.y) * 85.0) * pow(max(0.0, 1.0 - abs(q.x)), 1.1) * 1.2;
            vec3 tint = mix(uCore, uStreak, smoothstep(0.05, 0.7, abs(q.x)));
            vec3 col = uCore * core + tint * (streak + thin);
            gl_FragColor = vec4(col * uIntensity, 1.0);
          }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    [core, streak],
  );

  useFrame(({ camera }) => {
    const m = ref.current;
    if (!m || !m.parent?.visible) return;
    m.quaternion.copy(camera.quaternion);
    material.uniforms.uIntensity!.value = intensity();
  });

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      position={position}
      scale={[W * scale, H * scale, 1]}
      renderOrder={20}
      frustumCulled={false}
    />
  );
}
