"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  SRGBColorSpace,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3,
  type Group,
  type Texture,
} from "three";
import { projects } from "@/content/site";
import { director, type Tier } from "@/lib/director";
import { clamp, easeInOutCubic, lerp, mulberry32, smoothstep } from "@/lib/math";
import type { RigFn, Shot } from "../registry";
import { useSet } from "../useSet";
import { Beam, createBeamMaterial } from "../parts/Beam";
import { Dust, type BeamInfo } from "../parts/Dust";

const SW = 4.4;
const SH = 2.75;
const PROJECTOR = new Vector3(0, 3.6, 12);

const slot = (i: number) => i % 2; // 01 and 03 on the left, 02 and 04 deeper on the right
const screenPos = (k: number) => new Vector3(k === 0 ? -2.5 : 2.5, 0.75, -k * 3.8);
const screenRot = (k: number) => (k === 0 ? 0.3 : -0.3);
const SLOTS = [0, 1].map((k) => ({ pos: screenPos(k), rotY: screenRot(k) }));
const BEAMS: BeamInfo[] = SLOTS.map((s) => ({
  origin: PROJECTOR,
  target: s.pos,
  radius: 2.3,
}));

// ── Camera ──────────────────────────────────────────────────────────────────

interface Pose {
  pos: Vector3;
  look: Vector3;
}
const pose = (): Pose => ({ pos: new Vector3(), look: new Vector3() });
const A = pose();
const B = pose();
const W = pose();
const F = pose();

/** Full zoom on a slot: the screen fills the half of the frame beside its card. */
function focus(k: number, fit: number, out: Pose) {
  const s = SLOTS[k]!;
  // Text panel sits on the opposite side: push the screen into its half of the frame.
  const side = s.pos.x < 0 ? 1 : -1;
  out.pos.set(s.pos.x + side * 2.1, s.pos.y + 0.2, s.pos.z + 9.1 * fit);
  out.look.set(s.pos.x + side * 2.1, s.pos.y - 0.05, s.pos.z);
}

/** The whole room from the back rows. */
function wide(out: Pose, fit: number) {
  out.pos.set(0, 1.5, 10.5 * fit);
  out.look.set(0, 0.35, -2.5);
}

/** Where the camera starts before zooming in on a slot: far back in the room. */
function far(k: number, fit: number, out: Pose) {
  wide(out, fit);
  if (k === 0) return;
  focus(k, fit, F);
  out.pos.lerp(F.pos, 0.15);
  out.look.lerp(F.look, 0.15);
}

function mix(a: Pose, b: Pose, t: number, out: Shot) {
  out.pos.lerpVectors(a.pos, b.pos, t);
  out.look.lerpVectors(a.look, b.look, t);
}

/**
 * Which project owns the camera: the last present one whose card has started
 * to rise (or the first, before any has), and the present one after it.
 */
function lineup() {
  let cur = -1;
  let next = -1;
  const fs = director.features;
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i];
    if (!f?.present) continue;
    if (cur < 0 || f.enter > 0) {
      cur = i;
      next = -1;
    } else if (next < 0) next = i;
  }
  return { cur, next };
}

/** Below lg the card spans the width with its poster on top: no pinned zoom, no screens. */
const stacked = () => director.vw < 1024;

/** Brightness of a screen that isn't playing: dim enough to read as background behind a card. */
const PEEK_ON = 0.18;

const ease = (t: number, rm: boolean) => (rm ? (t >= 0.5 ? 1 : 0) : easeInOutCubic(t));

const rig: RigFn = (_t, shot: Shot, aspect, rm) => {
  const portrait = aspect < 1;
  const fit = portrait ? 1.25 : aspect < 1.35 ? 1.15 : 1;
  shot.fov = portrait ? 50 : 38;
  const { cur, next } = lineup();
  const f = director.features[cur];
  if (!f || stacked()) {
    wide(W, fit);
    mix(W, W, 0, shot);
    return;
  }
  if (next >= 0 && f.exit > 0) {
    // Handoff: back out of this screen towards the next one's starting point.
    focus(slot(cur), fit, A);
    far(slot(next), fit, B);
    mix(A, B, ease(f.exit, rm), shot);
  } else {
    // Entry: from the back of the room in to full zoom, then hold there.
    far(slot(cur), fit, A);
    focus(slot(cur), fit, B);
    mix(A, B, ease(f.enter, rm), shot);
  }
};

// ── Materials ───────────────────────────────────────────────────────────────

function screenMaterial(map: Texture, tint: string) {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uOn: { value: 0.3 },
      uAlpha: { value: 1 },
      uTime: { value: 0 },
      uTint: { value: new Color(tint) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOn;
      uniform float uAlpha;
      uniform float uTime;
      uniform vec3 uTint;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        uv += vec2(sin(uTime * 0.9), sin(uTime * 1.3)) * 0.0007;
        vec3 tex = texture2D(uMap, uv).rgb;
        float scan = 0.93 + 0.07 * sin(uv.y * 820.0);
        float flicker = 0.965 + 0.035 * sin(uTime * 47.0) * sin(uTime * 6.3);
        float vig = smoothstep(0.95, 0.3, length((uv - 0.5) * vec2(1.0, 1.25)));
        vec3 col = tex * scan * flicker * mix(0.45, 1.0, vig) * 0.82;
        col = mix(col * 0.12 + uTint * 0.01, col, uOn);
        gl_FragColor = vec4(col, uAlpha);
      }
    `,
    transparent: true,
  });
}

function frameMaterial(tint: string) {
  return new ShaderMaterial({
    uniforms: {
      uOn: { value: 0.3 },
      uAlpha: { value: 1 },
      uSize: { value: new Vector2(SW + 0.16, SH + 0.16) },
      uColor: { value: new Color(tint) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOn;
      uniform float uAlpha;
      uniform vec2 uSize;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        vec2 px = (0.5 - abs(vUv - 0.5)) * uSize;
        float d = min(px.x, px.y);
        float line = 1.0 - smoothstep(0.0, 0.018, abs(d - 0.03));
        vec3 col = vec3(0.012) + uColor * line * (0.4 + uOn * 1.6);
        gl_FragColor = vec4(col, uAlpha);
      }
    `,
    transparent: true,
  });
}

function glowMaterial(tint: string) {
  return new ShaderMaterial({
    uniforms: { uOn: { value: 0.3 }, uColor: { value: new Color(tint) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOn;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        vec2 q = (vUv - 0.5) * vec2(2.0, 2.0);
        float g = exp(-dot(q, q) * 3.2);
        gl_FragColor = vec4(uColor * g * 0.16 * uOn, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

function seatMaterial() {
  return new ShaderMaterial({
    uniforms: { uRim: { value: new Color("#e8a84b") }, uIntensity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uRim;
      uniform float uIntensity;
      varying vec3 vLocal;
      void main() {
        float top = smoothstep(0.2, 0.29, vLocal.y);
        vec3 col = vec3(0.008, 0.008, 0.011) + uRim * top * 0.16 * uIntensity;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// ── Set ─────────────────────────────────────────────────────────────────────

const screenGeo = new PlaneGeometry(SW, SH);
const frameGeo = new PlaneGeometry(SW + 0.16, SH + 0.16);
const glowGeo = new PlaneGeometry(SW * 2.6, SH * 3);
const seatGeo = new BoxGeometry(0.5, 0.58, 0.12);
const DUST_SIZE: [number, number, number] = [16, 9, 26];
const DUST_CENTER: [number, number, number] = [0, 0.5, 1];

/** Act III: a dark screening room. Each project plays on a floating screen. */
export function ScreeningSet({ tier }: { tier: Tier }) {
  const ref = useSet("screening", rig);
  const gl = useThree((s) => s.gl);
  const textures = useLoader(
    TextureLoader,
    projects.map((p) => p.texture),
  );

  const screens = useMemo(
    () =>
      projects.map((p, i) => {
        const tex = textures[i]!;
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = 4;
        return {
          screen: screenMaterial(tex, p.tint),
          frame: frameMaterial(p.tint),
          glow: glowMaterial(p.tint),
        };
      }),
    [textures],
  );

  useEffect(() => {
    textures.forEach((t) => gl.initTexture(t));
  }, [gl, textures]);

  const beamMat = useMemo(() => {
    const m = createBeamMaterial("#ffe0b0");
    m.uniforms.uIntensity!.value = 0.55;
    return m;
  }, []);
  const seatMat = useMemo(seatMaterial, []);

  const seatsRef = useRef<InstancedMesh>(null);
  const seatLayout = useMemo(() => {
    const rand = mulberry32(5);
    const step = tier === "high" ? 0.62 : 0.86;
    const rows = tier === "high" ? 12 : 8;
    const mats: Matrix4[] = [];
    for (let r = 0; r < rows; r++) {
      const z = 7 - r * 1.3;
      const y = -2.15 + (z + 9) * 0.05;
      for (let x = -6.6; x <= 6.6; x += step) {
        if (Math.abs(x) < 0.45) continue; // center aisle
        const m = new Matrix4().makeRotationY((rand() - 0.5) * 0.06);
        m.setPosition(x + (rand() - 0.5) * 0.04, y, z);
        mats.push(m);
      }
    }
    return mats;
  }, [tier]);

  useEffect(() => {
    const mesh = seatsRef.current;
    if (!mesh) return;
    seatLayout.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [seatLayout]);

  const groupRefs = useRef<(Group | null)[]>([]);

  useFrame((state) => {
    if (!ref.current?.visible) return;
    const rm = director.reducedMotion;
    const t = rm ? 3 : state.clock.elapsedTime;
    beamMat.uniforms.uTime!.value = t;
    const { cur, next } = lineup();
    const fc = director.features[cur];
    const enter = fc ? (rm ? ease(fc.enter, true) : fc.enter) : 0;
    const exit = fc && next >= 0 ? (rm ? ease(fc.exit, true) : fc.exit) : 0;
    let lit = 0;
    screens.forEach((s, i) => {
      const g = groupRefs.current[i];
      if (!g) return;
      // Only the project on stage and the one after it are drawn. The next one
      // peeks in the background from the deeper slot, or fades in during the
      // handoff; every other screen (left behind, collapsed) is hidden.
      let alpha = 0;
      let on = PEEK_ON;
      // A next screen in the front slot would sit right beside the camera while
      // it backs out, so that handoff fades one screen out before the other in.
      const peek = next >= 0 && slot(next) > slot(cur);
      if (i === cur) {
        alpha =
          next < 0 ? 1 : peek ? 1 - smoothstep(0.55, 1, exit) : 1 - smoothstep(0.3, 0.65, exit);
        on = lerp(PEEK_ON, 1, smoothstep(0, 0.7, enter)) * (1 - 0.8 * smoothstep(0, 0.6, exit));
      } else if (i === next) {
        alpha = peek ? 1 : smoothstep(0.7, 1, exit);
      }
      if (director.compiling) alpha = 1;
      g.visible = alpha > 0.001 && !stacked();
      if (!g.visible && !director.compiling) return;
      s.screen.uniforms.uOn!.value = on;
      s.screen.uniforms.uAlpha!.value = alpha;
      s.screen.uniforms.uTime!.value = t + i * 3.1;
      s.frame.uniforms.uOn!.value = on;
      s.frame.uniforms.uAlpha!.value = alpha;
      s.glow.uniforms.uOn!.value = on * alpha;
      if (i === cur) lit = on * alpha;
    });
    seatMat.uniforms.uIntensity!.value = lerp(0.6, 1, clamp(lit));
  });

  return (
    <group ref={ref} userData={{ set: true }}>
      {screens.map((s, i) => (
        <group
          key={projects[i]!.slug}
          ref={(g) => {
            groupRefs.current[i] = g;
          }}
          position={SLOTS[slot(i)]!.pos}
          rotation={[0, SLOTS[slot(i)]!.rotY, 0]}
          visible={false}
        >
          <mesh geometry={glowGeo} material={s.glow} position={[0, 0, -0.2]} renderOrder={3} />
          <mesh geometry={frameGeo} material={s.frame} position={[0, 0, -0.01]} renderOrder={4} />
          <mesh geometry={screenGeo} material={s.screen} renderOrder={5} />
        </group>
      ))}
      {BEAMS.map((b, i) => (
        <Beam key={i} origin={b.origin} target={b.target} radius={b.radius} material={beamMat} />
      ))}
      <instancedMesh
        ref={seatsRef}
        args={[seatGeo, seatMat, seatLayout.length]}
        frustumCulled={false}
      />
      <Dust
        count={tier === "high" ? 1100 : 450}
        size={DUST_SIZE}
        center={DUST_CENTER}
        beams={BEAMS}
        ambient={0.03}
        seed={21}
      />
    </group>
  );
}
