"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  Euler,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  MathUtils,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import { architecture } from "@/content/site";
import { buildMorph } from "@/lib/acts";
import { director, type Tier } from "@/lib/director";
import { clamp, easeInOutCubic, easeOutBack, lerp, mulberry32, smoothstep } from "@/lib/math";
import {
  archFrame,
  ARCH_GROW,
  LABEL_SIDE,
  LABEL_SPACING,
  LABEL_GAP,
  labelCol,
  labelEls,
  labelHeights,
  leaderEls,
  type RigFn,
} from "../registry";
import { useSet } from "../useSet";
import { Dust } from "../parts/Dust";

type NodeDef = (typeof architecture.nodes)[number];
const NODES = architecture.nodes;
const BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, NodeDef>;
const EDGES = architecture.edges;
const SAMPLES = 64;
const FLOOR_Y = -3.35;

// ── Geometry ────────────────────────────────────────────────────────────────

function samplePolyline(pts: Vector3[], n: number) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1]! + pts[i]!.distanceTo(pts[i - 1]!));
  const total = acc[acc.length - 1]!;
  const out: Vector3[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / (n - 1)) * total;
    while (j < acc.length - 2 && acc[j + 1]! < d) j++;
    const seg = acc[j + 1]! - acc[j]! || 1;
    out.push(pts[j]!.clone().lerp(pts[j + 1]!, clamp((d - acc[j]!) / seg)));
  }
  return out;
}

/** Spread every edge's anchor across the face it leaves from / arrives at. */
function anchorOffsets() {
  const slots = new Map<string, number[]>();
  EDGES.forEach(([a, b], e) => {
    const down = BY_ID[b]!.pos[1] < BY_ID[a]!.pos[1];
    const fa = `${a}:${down ? "bottom" : "top"}`;
    const fb = `${b}:${down ? "top" : "bottom"}`;
    (slots.get(fa) ?? slots.set(fa, []).get(fa)!).push(e);
    (slots.get(fb) ?? slots.set(fb, []).get(fb)!).push(e);
  });
  const offset = (node: string, face: string, e: number) => {
    const list = slots.get(`${node}:${face}`) ?? [e];
    const other = (i: number) => {
      const [a, b] = EDGES[i]!;
      return BY_ID[a === node ? b : a]!.pos[0];
    };
    const sorted = [...list].sort((x, y) => other(x) - other(y));
    const k = sorted.length;
    if (k === 1) return 0;
    return (sorted.indexOf(e) / (k - 1) - 0.5) * BY_ID[node]!.size[0] * 0.62;
  };
  return offset;
}

function cleanRoute(e: number, b: number, count: number, offset: ReturnType<typeof anchorOffsets>) {
  const [ia, ib] = EDGES[e]!;
  const A = BY_ID[ia]!;
  const B = BY_ID[ib]!;
  const down = B.pos[1] < A.pos[1];
  const spread = (b - (count - 1) / 2) * 0.05;
  const oz = ((b % 2) - 0.5) * 0.06;
  const sx = A.pos[0] + offset(ia, down ? "bottom" : "top", e) + spread;
  const ex = B.pos[0] + offset(ib, down ? "top" : "bottom", e) + spread;
  const sy = A.pos[1] + (down ? -A.size[1] / 2 : A.size[1] / 2);
  const ey = B.pos[1] + (down ? B.size[1] / 2 : -B.size[1] / 2);
  const sz = A.pos[2] + oz;
  const ez = B.pos[2] + oz;
  const midY = (sy + ey) / 2 + (b - (count - 1) / 2) * 0.025;
  return samplePolyline(
    [
      new Vector3(sx, sy, sz),
      new Vector3(sx, midY, sz),
      new Vector3(ex, midY, sz),
      new Vector3(ex, midY, ez),
      new Vector3(ex, ey, ez),
    ],
    SAMPLES,
  );
}

function tangleCurve(rand: () => number) {
  const R = new Vector3(3.5, 2.9, 2.3);
  const p = new Vector3((rand() - 0.5) * 5.6, (rand() - 0.5) * 4.6, (rand() - 0.5) * 3.2);
  const pts: Vector3[] = [];
  for (let k = 0; k < 8; k++) {
    pts.push(p.clone());
    const dir = new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
    p.addScaledVector(dir, 1.1 + rand() * 1.7);
    const e = Math.hypot(p.x / R.x, p.y / R.y, p.z / R.z);
    if (e > 1) p.multiplyScalar((0.7 + rand() * 0.3) / e);
  }
  return new CatmullRomCurve3(pts, false, "catmullrom", 0.5).getSpacedPoints(SAMPLES - 1);
}

/** Every cable as a strip of screen-space quads, holding both its tangled and routed shape. */
function buildCables(count: number) {
  const rand = mulberry32(1337);
  const E = EDGES.length;
  const offset = anchorOffsets();
  const segs = count * (SAMPLES - 1);
  const aT0 = new Float32Array(segs * 3);
  const aT1 = new Float32Array(segs * 3);
  const aC0 = new Float32Array(segs * 3);
  const aC1 = new Float32Array(segs * 3);
  const aU = new Float32Array(segs * 2);
  const aSeed = new Float32Array(segs);
  const aDelay = new Float32Array(segs);
  let o = 0;
  for (let c = 0; c < count; c++) {
    const e = c % E;
    const b = Math.floor(c / E);
    const bundle = Math.floor(count / E) + (e < count % E ? 1 : 0);
    const tangle = tangleCurve(rand);
    const clean = cleanRoute(e, b, bundle, offset);
    const seed = rand();
    const delay = 0.02 + (e / E) * 0.3 + rand() * 0.1;
    for (let s = 0; s < SAMPLES - 1; s++, o++) {
      tangle[s]!.toArray(aT0, o * 3);
      tangle[s + 1]!.toArray(aT1, o * 3);
      clean[s]!.toArray(aC0, o * 3);
      clean[s + 1]!.toArray(aC1, o * 3);
      aU[o * 2] = s / (SAMPLES - 1);
      aU[o * 2 + 1] = (s + 1) / (SAMPLES - 1);
      aSeed[o] = seed;
      aDelay[o] = delay;
    }
  }
  const g = new InstancedBufferGeometry();
  g.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3),
  );
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.setAttribute("aT0", new InstancedBufferAttribute(aT0, 3));
  g.setAttribute("aT1", new InstancedBufferAttribute(aT1, 3));
  g.setAttribute("aC0", new InstancedBufferAttribute(aC0, 3));
  g.setAttribute("aC1", new InstancedBufferAttribute(aC1, 3));
  g.setAttribute("aU", new InstancedBufferAttribute(aU, 2));
  g.setAttribute("aSeed", new InstancedBufferAttribute(aSeed, 1));
  g.setAttribute("aDelay", new InstancedBufferAttribute(aDelay, 1));
  g.instanceCount = segs;
  return g;
}

// ── Materials ───────────────────────────────────────────────────────────────

function cableMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uMorph: { value: 0 },
      uTime: { value: 0 },
      uWidth: { value: 2 },
      uRes: { value: new Vector2(1, 1) },
      uPulse: { value: 0 },
      uOpacity: { value: 1 },
      uTangle: { value: new Color("#5d6f78") },
      uError: { value: new Color("#ff5a45") },
      uAmber: { value: new Color("#e8a84b") },
      uTeal: { value: new Color("#5ec8d0") },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aT0;
      attribute vec3 aT1;
      attribute vec3 aC0;
      attribute vec3 aC1;
      attribute vec2 aU;
      attribute float aSeed;
      attribute float aDelay;
      uniform float uMorph;
      uniform float uTime;
      uniform float uWidth;
      uniform vec2 uRes;
      varying float vU;
      varying float vSeed;
      varying float vM;
      varying float vSide;

      vec3 place(vec3 t, vec3 c, float u, out float m) {
        float d = aDelay + u * 0.12;
        m = smoothstep(d, d + 0.4, uMorph);
        float j = 1.0 - m;
        vec3 wob = vec3(
          sin(uTime * 0.7 + u * 9.0 + aSeed * 20.0),
          cos(uTime * 0.6 + u * 7.0 + aSeed * 13.0),
          sin(uTime * 0.5 + u * 11.0 + aSeed * 5.0));
        vec3 p = mix(t + wob * 0.1 * j, c, m);
        vec3 swing = normalize(vec3(sin(aSeed * 31.0), cos(aSeed * 17.0), sin(aSeed * 7.0 + 1.0)));
        return p + swing * sin(m * 3.14159) * 0.7;
      }

      void main() {
        float m0;
        float m1;
        vec3 a = place(aT0, aC0, aU.x, m0);
        vec3 b = place(aT1, aC1, aU.y, m1);
        vec4 ca = projectionMatrix * modelViewMatrix * vec4(a, 1.0);
        vec4 cb = projectionMatrix * modelViewMatrix * vec4(b, 1.0);
        float aspect = uRes.x / uRes.y;
        vec2 dir = (cb.xy / cb.w - ca.xy / ca.w) * vec2(aspect, 1.0);
        float len = length(dir);
        dir = len > 1e-6 ? dir / len : vec2(1.0, 0.0);
        vec2 n = vec2(-dir.y, dir.x) / vec2(aspect, 1.0);
        bool atB = position.x > 0.5;
        vec4 clip = atB ? cb : ca;
        float m = atB ? m1 : m0;
        float w = uWidth * mix(1.0, 1.35, m);
        clip.xy += n * position.y * (w / uRes.y) * clip.w;
        vU = atB ? aU.y : aU.x;
        vSeed = aSeed;
        vM = m;
        vSide = position.y;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTangle;
      uniform vec3 uError;
      uniform vec3 uAmber;
      uniform vec3 uTeal;
      uniform float uTime;
      uniform float uPulse;
      uniform float uOpacity;
      varying float vU;
      varying float vSeed;
      varying float vM;
      varying float vSide;
      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      void main() {
        float edge = 1.0 - smoothstep(0.3, 1.0, abs(vSide));
        float flick = step(0.955, hash(floor(vSeed * 997.0) + floor(uTime * 6.0)));
        vec3 tangle = mix(uTangle, uError, flick);
        float tangleA = 0.3 + flick * 0.8;
        vec3 base = mix(uAmber, uTeal, step(0.72, fract(vSeed * 13.17)));
        float ph = fract(vU * 1.3 - uTime * 0.18 - vSeed * 3.7);
        float k = (ph - 0.5) * 26.0;
        float pulse = exp(-k * k) * uPulse;
        vec3 clean = base * 0.6 + vec3(1.0, 0.9, 0.72) * pulse * 3.0;
        float cleanA = 0.8 + pulse;
        vec3 col = mix(tangle, clean, vM);
        float a = mix(tangleA, cleanA, vM) * edge * uOpacity;
        gl_FragColor = vec4(col * a, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

function nodeMaterial(size: readonly number[]) {
  return new ShaderMaterial({
    uniforms: {
      uHalf: { value: new Vector3(size[0]! / 2, size[1]! / 2, size[2]! / 2) },
      uGlow: { value: 0 },
      uTime: { value: 0 },
      uEdge: { value: new Color("#e8a84b") },
      uFace: { value: new Color("#07080c") },
      uRim: { value: new Color("#5ec8d0") },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vPos = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = cameraPosition - w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uHalf;
      uniform float uGlow;
      uniform float uTime;
      uniform vec3 uEdge;
      uniform vec3 uFace;
      uniform vec3 uRim;
      varying vec3 vPos;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec3 d = uHalf - abs(vPos);
        float mn = min(d.x, min(d.y, d.z));
        float mx = max(d.x, max(d.y, d.z));
        float mid = d.x + d.y + d.z - mn - mx;
        float edge = 1.0 - smoothstep(0.0, 0.022, mid);
        float halo = 1.0 - smoothstep(0.0, 0.14, mid);
        float fres = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 3.0);
        float scan = 0.5 + 0.5 * sin(vPos.x * 40.0 - uTime * 2.4);
        vec3 col = uFace + uRim * fres * 0.25;
        col += uEdge * (edge * 2.4 + halo * 0.18) * uGlow;
        col += uEdge * scan * 0.025 * uGlow * step(uHalf.y - 0.001, vPos.y);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function floorMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uReveal: { value: 0 },
      uColor: { value: new Color("#5ec8d0") },
      uPlate: { value: new Color("#e8a84b") },
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
      uniform float uReveal;
      uniform vec3 uColor;
      uniform vec3 uPlate;
      varying vec3 vW;
      void main() {
        vec2 g = vW.xz * 2.0;
        vec2 grid = abs(fract(g - 0.5) - 0.5) / fwidth(g);
        float line = 1.0 - min(min(grid.x, grid.y), 1.0);
        float d = length(vW.xz);
        float fade = 1.0 - smoothstep(2.5, 11.0, d);
        float ring = 1.0 - smoothstep(uReveal * 12.0 - 1.5, uReveal * 12.0, d);
        vec2 q = abs(vW.xz) - vec2(3.7, 1.7);
        float box = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        float plate = (1.0 - smoothstep(0.0, 0.035, abs(box))) * uReveal;
        float inner = (1.0 - smoothstep(-0.02, 0.0, box)) * uReveal;
        vec3 col = uColor * line * fade * ring * 0.16 + uPlate * plate * 1.1 + uPlate * inner * line * 0.22;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

// ── Camera ──────────────────────────────────────────────────────────────────

const UP = new Vector3(0, 1, 0);
const right = new Vector3();

/** Corners of the assembled architecture's bounding box. */
/** Each block's assembled corners, for projecting its screen rect. */
const NODE_CORNERS = NODES.map((n) => {
  const out: Vector3[] = [];
  for (const sx of [-0.5, 0.5])
    for (const sy of [-0.5, 0.5])
      for (const sz of [-0.5, 0.5])
        out.push(
          new Vector3(
            n.pos[0] + sx * n.size[0],
            n.pos[1] + sy * n.size[1],
            n.pos[2] + sz * n.size[2],
          ),
        );
  return out;
});
/** The diagram's real outline: every block corner (its axis-aligned box overstates it). */
const OUTLINE = NODE_CORNERS.flat();

const probe = new PerspectiveCamera();
const pv = new Vector3();
const fwd = new Vector3();
const camUp = new Vector3();
const off = new Vector3();
const fitted = { pos: new Vector3(), look: new Vector3() };
const rect = { l: 0, t: 0, r: 0, b: 0 };

/** Screen rect (px) of the given world points for a camera at pos → look. */
function project(
  points: Vector3[],
  cam: PerspectiveCamera,
  vw: number,
  vh: number,
  out = rect,
  offset?: Vector3,
) {
  out.l = out.t = Infinity;
  out.r = out.b = -Infinity;
  for (const p of points) {
    pv.copy(p);
    if (offset) pv.add(offset);
    pv.project(cam);
    const x = (pv.x * 0.5 + 0.5) * vw;
    const y = (-pv.y * 0.5 + 0.5) * vh;
    out.l = Math.min(out.l, x);
    out.r = Math.max(out.r, x);
    out.t = Math.min(out.t, y);
    out.b = Math.max(out.b, y);
  }
  return out;
}

/**
 * Frames the assembled system inside BuildAct's clear space, leaving room for
 * the label columns: dolly in until its blocks fill the space (at most
 * ARCH_GROW past the rig's own shot), then slide the camera parallel to the
 * image plane until the system is centred.
 */
function fitToFrame(pos: Vector3, look: Vector3, fov: number, vw: number, vh: number) {
  const f = archFrame;
  const x0 = f.left + (f.columns ? labelCol(vw, "left") + LABEL_GAP : 0);
  const x1 = f.right - (f.columns ? labelCol(vw, "right") + LABEL_GAP : 0);
  const tanH = Math.tan(MathUtils.degToRad(fov / 2));
  probe.fov = fov;
  probe.aspect = vw / vh;
  probe.updateProjectionMatrix();
  // The system may grow at most ARCH_GROW past the rig's own shot.
  const minDist = pos.distanceTo(look) / ARCH_GROW;
  // Centre and scale in turn: perspective shifts one when the other changes.
  for (let k = 0; k < 7; k++) {
    probe.position.copy(pos);
    probe.lookAt(look);
    probe.updateMatrixWorld();
    const r = project(OUTLINE, probe, vw, vh);
    if (k % 2 === 1) {
      const s = Math.max(
        (r.r - r.l) / Math.max(1, x1 - x0),
        (r.b - r.t) / Math.max(1, f.bottom - f.top),
      );
      off.subVectors(pos, look);
      const d = Math.max(off.length() * s, minDist);
      pos.copy(look).addScaledVector(off, d / off.length());
      continue;
    }
    const wpp = (2 * pos.distanceTo(look) * tanH) / vh;
    fwd.subVectors(look, pos).normalize();
    right.crossVectors(fwd, UP).normalize();
    camUp.crossVectors(right, fwd);
    const dx = (x0 + x1) / 2 - (r.l + r.r) / 2;
    const dy = (f.top + f.bottom) / 2 - (r.t + r.b) / 2;
    off
      .copy(right)
      .multiplyScalar(-dx * wpp)
      .addScaledVector(camUp, dy * wpp);
    pos.add(off);
    look.add(off);
  }
}

const rig: RigFn = (t, shot, aspect, rm) => {
  const portrait = aspect < 1;
  const fit = portrait ? clamp(1.55 / aspect, 1, 2.5) : aspect < 1.35 ? 1.18 : 1;
  const local = rm ? (director.T < 2 ? 0.6 : 1.9) : t;
  let theta: number;
  let R: number;
  let h: number;
  let lookY = 0;
  // Phones orbit less, so the narrow frame keeps the tiers spread apart.
  const spin = portrait ? 0.45 : 1;
  if (local < 1) {
    const p = easeInOutCubic(local);
    theta = lerp(0.38, 0.1, p) * spin;
    R = lerp(17, 12, p);
    h = lerp(1.3, 0.4, p);
    lookY = -0.25;
  } else {
    const p = easeInOutCubic(clamp((local - 1) / 0.9));
    theta = lerp(0.1, -0.5, p) * spin;
    R = lerp(12, 14, p);
    h = lerp(0.4, 3.4, p);
    lookY = lerp(-0.25, -0.55, p);
  }
  R *= fit;
  shot.pos.set(Math.sin(theta) * R, h, Math.cos(theta) * R);
  shot.look.set(0, lookY, 0);
  // Act II frames the system into the space the copy leaves free.
  const w = archFrame.ready ? smoothstep(0.8, 1, local) : 0;
  if (w > 0) {
    fitted.pos.copy(shot.pos);
    fitted.look.copy(shot.look);
  }
  if (!portrait) {
    // Frame the system to the right of the pinned copy.
    right.subVectors(shot.look, shot.pos).cross(UP).normalize();
    const s = -1.6 * Math.min(1, aspect / 1.6);
    shot.pos.addScaledVector(right, s);
    shot.look.addScaledVector(right, s);
  } else {
    // Copy sits at the top on phones: drop the system into the lower half.
    shot.pos.y += 2.6;
    shot.look.y += 2.6;
  }
  if (w > 0) {
    const { vw, vh } = director;
    fitToFrame(fitted.pos, fitted.look, 38, vw, vh);
    shot.pos.lerp(fitted.pos, w);
    shot.look.lerp(fitted.look, w);
  }
  shot.fov = 38;
};

// ── Set ─────────────────────────────────────────────────────────────────────

// ── Labels ──────────────────────────────────────────────────────────────────

const labelOps = NODES.map(() => 0);
const nodeRects = NODES.map(() => ({ l: 0, t: 0, r: 0, b: 0 }));
/** The set's offset while it rises with the pinned copy (see SystemSet). */
const lifted = new Vector3();

interface Slot {
  id: string;
  h: number;
  y: number;
  /** Leader target, or null for no leader. */
  ax: number | null;
  ay: number;
  op: number;
}
const slots: Record<"left" | "right", Slot[]> = { left: [], right: [] };

/**
 * Places the labels in two columns beside the diagram (left blocks on the
 * left, right blocks on the right), each as close to its block's height as
 * the column allows: labels keep LABEL_SPACING px apart and stay inside the
 * frame, so they never touch each other, a block or the caption.
 */
function layoutLabels(
  cam: PerspectiveCamera,
  vw: number,
  vh: number,
  lift: number,
  platOp: number,
) {
  if (!archFrame.columns) {
    labelEls.forEach((el) => (el.style.opacity = "0"));
    leaderEls.forEach((el) => (el.style.opacity = "0"));
    return;
  }
  const diag = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
  NODES.forEach((_, i) => {
    const r = project(NODE_CORNERS[i]!, cam, vw, vh, nodeRects[i], lifted);
    diag.l = Math.min(diag.l, r.l);
    diag.r = Math.max(diag.r, r.r);
    diag.t = Math.min(diag.t, r.t);
    diag.b = Math.max(diag.b, r.b);
  });
  slots.left.length = 0;
  slots.right.length = 0;
  NODES.forEach((n, i) => {
    const r = nodeRects[i]!;
    const side = LABEL_SIDE[n.id] ?? "right";
    const h = labelHeights.get(n.id) ?? 30;
    const ay = (r.t + r.b) / 2;
    // Land the leader just inside the block's outer edge.
    const ax = side === "left" ? r.l + (r.r - r.l) * 0.08 : r.r - (r.r - r.l) * 0.08;
    slots[side].push({ id: n.id, h, y: ay - h / 2, ax, ay, op: labelOps[i]! });
  });
  const ph = labelHeights.get("platform") ?? 30;
  slots.right.push({ id: "platform", h: ph, y: diag.b - ph, ax: null, ay: 0, op: platOp });

  const top = archFrame.top - lift;
  const bottom = archFrame.bottom - lift;
  for (const side of ["left", "right"] as const) {
    const col = slots[side].sort((a, b) => a.y - b.y);
    // Push down to clear the label above, then up to stay inside the frame.
    let y = top;
    for (const s of col) {
      s.y = Math.max(s.y, y);
      y = s.y + s.h + LABEL_SPACING;
    }
    y = bottom;
    for (let k = col.length - 1; k >= 0; k--) {
      const s = col[k]!;
      s.y = Math.min(s.y, y - s.h);
      y = s.y - LABEL_SPACING;
    }
    const x = side === "left" ? diag.l - LABEL_GAP : diag.r + LABEL_GAP;
    for (const s of col) {
      const el = labelEls.get(s.id);
      if (el) {
        el.style.transform =
          side === "left"
            ? `translate3d(${x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0) translateX(-100%)`
            : `translate3d(${x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
        el.style.opacity = s.op.toFixed(3);
      }
      const line = leaderEls.get(s.id);
      if (!line) continue;
      if (s.ax === null || s.op <= 0.001) {
        line.style.opacity = "0";
        continue;
      }
      const x0 = x + (side === "left" ? 4 : -4);
      const y0 = s.y + s.h / 2;
      const dx = s.ax - x0;
      const dy = s.ay - y0;
      const len = Math.hypot(dx, dy);
      line.style.transform = `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0) rotate(${Math.atan2(dy, dx).toFixed(4)}rad) scaleX(${len.toFixed(1)})`;
      line.style.opacity = s.op.toFixed(3);
    }
  }
}

const boxGeos = new Map<string, BoxGeometry>();
const floorGeo = new PlaneGeometry(40, 40).rotateX(-Math.PI / 2);
const DUST_SIZE: [number, number, number] = [22, 14, 22];
const DUST_CENTER: [number, number, number] = [0, 0, 0];

/** Acts I and II: tangled cables that resolve into a clean, glowing architecture. */
export function SystemSet({ tier }: { tier: Tier }) {
  const ref = useSet("system", rig);
  const nodeRefs = useRef<(Mesh | null)[]>([]);
  const cablesRef = useRef<Group>(null);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const cables = useMemo(() => buildCables(tier === "high" ? 70 : 40), [tier]);
  const cableMat = useMemo(cableMaterial, []);
  const floorMat = useMemo(floorMaterial, []);

  const nodes = useMemo(() => {
    const rand = mulberry32(99);
    return NODES.map((n, i) => {
      const key = n.size.join("x");
      if (!boxGeos.has(key)) boxGeos.set(key, new BoxGeometry(n.size[0], n.size[1], n.size[2]));
      return {
        def: n,
        geo: boxGeos.get(key)!,
        mat: nodeMaterial(n.size),
        to: new Vector3(...n.pos),
        from: new Vector3((rand() - 0.5) * 7, (rand() - 0.5) * 5, (rand() - 0.5) * 4),
        rot: new Quaternion().setFromEuler(new Euler(rand() * 3, rand() * 3, rand() * 3)),
        t0: 0.06 + i * 0.065,
      };
    });
  }, []);

  const q0 = useMemo(() => new Quaternion(), []);
  const wasVisible = useRef(false);

  useFrame((state) => {
    const group = ref.current;
    const visible = !!group?.visible && !director.compiling;
    if (!visible) {
      if (wasVisible.current) {
        labelEls.forEach((el) => (el.style.opacity = "0"));
        leaderEls.forEach((el) => (el.style.opacity = "0"));
      }
      wasVisible.current = false;
      if (!director.compiling) return;
    }
    wasVisible.current = visible;

    // Reduced motion: hold every ambient animation on a still frame.
    const t = director.reducedMotion ? 8 : state.clock.elapsedTime;
    const T = director.T;
    const morph = director.reducedMotion ? (T >= 2 ? 1 : 0) : buildMorph(T);

    const u = cableMat.uniforms;
    u.uMorph!.value = morph;
    u.uTime!.value = t;
    u.uPulse!.value = smoothstep(0.8, 1, morph);
    u.uWidth!.value = (tier === "high" ? 1.7 : 1.9) * dpr;
    (u.uRes!.value as Vector2).set(size.width * dpr, size.height * dpr);
    floorMat.uniforms.uReveal!.value = smoothstep(0.55, 1, morph);

    // The tangle drifts; it settles square as the build resolves.
    if (cablesRef.current) {
      const settle = 1 - smoothstep(0, 0.45, morph);
      cablesRef.current.rotation.y = Math.sin(t * 0.08) * 0.5 * settle;
      cablesRef.current.rotation.x = Math.sin(t * 0.05 + 1) * 0.12 * settle;
    }

    const cam = state.camera;
    nodes.forEach((n, i) => {
      const mesh = nodeRefs.current[i];
      if (!mesh) return;
      const s = smoothstep(n.t0, n.t0 + 0.24, morph);
      const k = easeOutBack(s, 1.6);
      mesh.position.lerpVectors(n.from, n.to, k);
      mesh.quaternion.slerpQuaternions(n.rot, q0, clamp(k));
      mesh.scale.setScalar(Math.max(0.0001, k));
      mesh.visible = s > 0.001 || director.compiling;
      n.mat.uniforms.uGlow!.value = s;
      n.mat.uniforms.uTime!.value = t;
      labelOps[i] = visible ? smoothstep(0.75, 1, s) : 0;
    });
    // As Act II scrolls away, the whole set rises with the pinned copy, px for
    // px at the diagram's depth. Applied to the set (not the damped camera) so
    // the caption and the diagram move exactly together and never cross.
    const lift = archFrame.ready
      ? Math.max(0, director.scroll + size.height - archFrame.sectionBottom)
      : 0;
    if (group) {
      if (lift > 0) {
        const fov = MathUtils.degToRad((cam as PerspectiveCamera).fov);
        const wpp = (2 * cam.position.length() * Math.tan(fov / 2)) / size.height;
        lifted
          .set(0, 1, 0)
          .applyQuaternion(cam.quaternion)
          .multiplyScalar(lift * wpp);
      } else lifted.set(0, 0, 0);
      group.position.copy(lifted);
    }
    if (visible) {
      layoutLabels(
        cam as PerspectiveCamera,
        size.width,
        size.height,
        lift,
        smoothstep(0.85, 1, morph),
      );
    }
  });

  return (
    <group ref={ref} userData={{ set: true }}>
      <group ref={cablesRef}>
        <mesh geometry={cables} material={cableMat} frustumCulled={false} renderOrder={4} />
      </group>
      {nodes.map((n, i) => (
        <mesh
          key={n.def.id}
          ref={(m) => {
            nodeRefs.current[i] = m;
          }}
          geometry={n.geo}
          material={n.mat}
          renderOrder={2}
        />
      ))}
      <mesh geometry={floorGeo} material={floorMat} position={[0, FLOOR_Y, 0]} renderOrder={1} />
      <Dust
        count={tier === "high" ? 700 : 300}
        size={DUST_SIZE}
        center={DUST_CENTER}
        ambient={0.09}
        color="#bfe3e6"
        pointSize={22}
        seed={11}
      />
    </group>
  );
}
