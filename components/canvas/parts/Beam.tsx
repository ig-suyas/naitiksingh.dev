"use client";

import { useMemo } from "react";
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from "three";
import { SIMPLEX3 } from "../shaders/chunks";

const DOWN = new Vector3(0, -1, 0);

/** Unit cone from apex (y=0) to base (y=-1), shared by every beam. */
let cone: CylinderGeometry | null = null;
function getCone() {
  if (!cone) {
    cone = new CylinderGeometry(0.03, 1, 1, 48, 1, true);
    cone.translate(0, -0.5, 0);
  }
  return cone;
}

export function createBeamMaterial(color = "#ffcf8a") {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uIntensity: { value: 1 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying float vAlong;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vLocal;
      void main() {
        vAlong = -position.y;
        vLocal = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      varying float vAlong;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vLocal;
      ${SIMPLEX3}
      void main() {
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float core = pow(clamp(facing, 0.0, 1.0), 2.6);
        // clamp: interpolation can overshoot 1.0, and pow() of a negative base is NaN,
        // which a bloom pass would smear across the whole frame.
        float len = pow(clamp(1.0 - vAlong, 0.0, 1.0), 1.5) * smoothstep(0.0, 0.04, vAlong + 0.01);
        vec2 radial = vLocal.xz / max(0.08, 0.03 + vAlong);
        float n = snoise(vec3(radial * 2.2, vAlong * 3.5 - uTime * 0.12));
        float shafts = 0.5 + 0.5 * n;
        float a = core * len * mix(0.55, 1.0, shafts) * uIntensity * 0.42;
        gl_FragColor = vec4(uColor * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

/** A volumetric-looking light cone from `origin` towards `target`. */
export function Beam({
  origin,
  target,
  radius,
  material,
}: {
  origin: Vector3;
  target: Vector3;
  radius: number;
  material: ShaderMaterial;
}) {
  const { quaternion, length } = useMemo(() => {
    const dir = new Vector3().subVectors(target, origin);
    const length = dir.length();
    const quaternion = new Quaternion().setFromUnitVectors(DOWN, dir.normalize());
    return { quaternion, length };
  }, [origin, target]);

  return (
    <mesh
      geometry={getCone()}
      material={material}
      position={origin}
      quaternion={quaternion}
      scale={[radius, length, radius]}
      frustumCulled={false}
      renderOrder={5}
    />
  );
}
