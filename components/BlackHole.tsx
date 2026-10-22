"use client";

/**
 * Black Hole: Shadeon shader, self-contained (no dependencies).
 * Source: github.com/ig-suyas/Shadeon, src/shaders/black-hole (MIT).
 *
 * A ray-traced Schwarzschild black hole seen from just above its accretion
 * disk. Changes from the Shadeon export, for layering over a page:
 *  - The canvas is transparent: empty space has zero alpha, so whatever is
 *    behind it (here, the dark stage) stays visible. The shadow of
 *    the hole is opaque black, and glowing gas is as opaque as it is bright.
 *  - It compiles only as it approaches the viewport (with parallel shader
 *    compilation where available), draws only while on screen and the tab is
 *    visible, adapts its resolution to hold the frame rate, renders one still
 *    frame for prefers-reduced-motion, and falls back to a static CSS
 *    picture when WebGL is missing, software-rendered or lost.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Colors = [string, string, string, string];

export interface BlackHoleProps {
  /** Animation speed multiplier. */
  speed?: number;
  /** How large the hole appears (0.4 to 2). */
  scale?: number;
  /** How brightly the disk burns (0.3 to 2.5). */
  intensity?: number;
  /** View elevation above the disk, in degrees (2 to 30). */
  tilt?: number;
  /** Horizontal offset of the hole from the frame center (-0.5 to 0.5). */
  x?: number;
  /** Vertical offset of the hole from the frame center (-0.5 to 0.5). */
  y?: number;
  seed?: number;
  /** Space, outer disk, middle disk, core. */
  colors?: Colors;
  /** Cap on device pixel ratio. */
  maxDpr?: number;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_COLORS: Colors = ["#000000", "#9a4614", "#f2a873", "#fff4e8"];
/** Time shown as the still frame for prefers-reduced-motion. */
const STILL_TIME = 6;

const VERT = `attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_tilt;
uniform float u_x;
uniform float u_y;

float hash21(vec2 p) {
  vec3 q = fract(p.xyx * vec3(0.1379, 0.2137, 0.1731));
  q += dot(q, q.yzx + 31.73);
  return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = turn * p * 2.03 + 11.7;
    amp *= 0.5;
  }
  return sum / 0.9375;
}

vec2 seedOffset(float seed) {
  return vec2(fract(seed * 0.1731), fract(seed * 0.2913)) * 64.0;
}

vec3 dither(vec3 color) {
  return color + (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
}

// Units: the Schwarzschild radius is 1 (horizon r = 1, photon sphere 1.5,
// shadow radius 2.6, innermost stable orbit 3).
const float R_IN = 3.0;
const float R_OUT = 16.0;
const float CAM_DIST = 26.0;
const float B_CRIT = 2.598;

vec3 ramp(float h) {
  vec3 c = mix(u_color2 * 0.3, u_color2, smoothstep(0.0, 0.22, h));
  c = mix(c, u_color3, smoothstep(0.18, 0.55, h));
  return mix(c, u_color4, smoothstep(0.5, 1.05, h));
}

vec4 disk(vec3 hit, vec3 dir, vec2 offset, float order) {
  float r = length(hit.xz);
  if (r < R_IN || r > R_OUT) return vec4(0.0);
  float phi = atan(hit.z, hit.x) - u_time * 0.32 * pow(R_IN / r, 1.5);
  vec2 ring = vec2(cos(phi), sin(phi));
  float rw = r + (fbm(ring * 2.1 + vec2(r * 0.45, 0.0) + offset) - 0.5) * 0.9;
  float lanes = smoothstep(0.28, 0.78, fbm(vec2(rw * 2.4, ring.x * 0.8 + ring.y * 0.6) + offset * 1.3));
  float rf = rw + (noise(ring * 6.0 + vec2(rw * 2.0, 0.0) - offset) - 0.5) * 0.35;
  float f1 = noise(vec2(rf * 24.0, ring.x * 3.2) + offset);
  float f2 = noise(vec2(rf * 24.0 + 9.1, ring.y * 3.2) - offset);
  float fibre = mix(f1, f2, ring.y * ring.y);
  float grain = noise(vec2(rw * 58.0, ring.x * 3.3 + ring.y * 2.1) + offset * 3.0);
  float clump = fbm(ring * 4.2 + vec2(rw * 0.9, -rw * 0.5) + offset * 1.7);
  float dens = (0.18 + 1.0 * lanes) * (0.5 + 0.85 * clump) * (0.55 + 0.6 * fibre + 0.3 * grain);

  vec3 tang = normalize(vec3(-hit.z, 0.0, hit.x));
  float beta = min(sqrt(0.5 / r), 0.55);
  float gamma = inversesqrt(1.0 - beta * beta);
  float dop = 1.0 / (gamma * (1.0 - beta * dot(tang, -dir)));
  float beam = mix(1.0, dop * dop * dop, 0.75);

  float heat = pow(R_IN / r, 1.6);
  float edges = smoothstep(R_IN, R_IN + 0.5, r) * (1.0 - smoothstep(R_OUT * 0.35, R_OUT, r));
  float fade = order < 0.5 ? 1.0 : (order < 1.5 ? 0.8 : 0.3);
  float light = heat * dens * beam * edges * fade;
  vec3 col = ramp(clamp(pow(heat, 0.55) * dop * (0.7 + 0.4 * dens), 0.0, 1.2));
  float alpha = clamp(light * 1.5, 0.0, 0.9) * edges;
  return vec4(col * light * 2.6, alpha);
}

void main() {
  vec2 res = u_resolution;
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / res.y;
  vec2 hole = vec2(u_x * res.x / res.y, u_y);
  vec2 q = p - hole;
  float roll = -0.32;
  q = mat2(cos(roll), sin(roll), -sin(roll), cos(roll)) * q;
  float lens = 7.0 / u_scale;

  float el = radians(u_tilt);
  vec3 cam = CAM_DIST * vec3(0.0, sin(el), cos(el));
  vec3 fwd = -normalize(cam);
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fwd);
  vec3 dir = normalize(fwd + (q.x * right + q.y * up) * lens / CAM_DIST);

  vec3 x = cam;
  vec3 v = dir;
  vec3 hv = cross(x, v);
  float h2 = dot(hv, hv);
  float b = sqrt(h2);
  vec2 offset = seedOffset(u_seed);

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float order = 0.0;
  float haze = 1e3;
  // 1 where the ray fell into the hole: the shadow is opaque, space is not.
  float captured = 0.0;

  float reach = R_OUT + 2.0;
  float bq = dot(x, v);
  float disc = bq * bq - (dot(x, x) - reach * reach);
  if (disc > 0.0) {
    x += v * max(-bq - sqrt(disc), 0.0);
    for (int i = 0; i < 240; i++) {
      float r = length(x);
      float dt = clamp(r * mix(0.07, 0.16, smoothstep(2.0, 5.0, r)), 0.02, 2.0);
      float r2 = r * r;
      vec3 acc = -1.5 * h2 * x / (r2 * r2 * r);
      vec3 nv = v + acc * dt;
      vec3 nx = x + nv * dt;
      if (abs(nx.y) < 2.5) {
        float rr = length(nx.xz);
        float k = R_IN / max(rr, R_IN);
        float near = exp(-abs(nx.y) * 1.8) * smoothstep(R_OUT, R_IN, rr) * smoothstep(R_IN * 0.7, R_IN * 1.5, rr);
        col += (1.0 - alpha) * u_color3 * near * k * sqrt(k) * 0.045 * dt;
      }
      if (x.y * nx.y < 0.0) {
        vec3 hit = mix(x, nx, x.y / (x.y - nx.y));
        vec4 d = disk(hit, normalize(nv), offset, order);
        col += (1.0 - alpha) * d.rgb;
        alpha += (1.0 - alpha) * d.a;
        order += 1.0;
      }
      haze = min(haze, length(vec2(length(nx.xz) - R_IN * 1.5, nx.y * 1.6)));
      x = nx;
      v = nv;
      if (r < 1.02) { captured = 1.0; break; }
      if (alpha > 0.995) break;
      if (r > reach && dot(x, v) > 0.0) break;
    }
  }

  float dr = b - B_CRIT;
  float around = atan(q.y, q.x);
  float uneven = 0.55 + 0.9 * noise(vec2(around * 4.0, 1.7) + offset) * noise(vec2(around * 9.0, 4.1) - offset);
  float side = 0.3 + 0.7 * clamp(q.x / max(length(q), 1e-3) * 0.8 + 0.45, 0.0, 1.0);
  float ring = exp(-abs(dr) * 12.0) * 0.22 + exp(-max(dr, 0.0) * 2.4) * 0.05 * step(0.0, dr);
  float bleed = exp(min(dr, 0.0) * 2.4) * step(dr, 0.0);
  col += (1.0 - alpha * 0.7) * u_color4 * (ring * uneven * side + bleed * 0.05);

  float inShadow = smoothstep(0.0, -0.35, dr);
  col += u_color3 * (exp(-haze * 0.9) * 0.11 + exp(-haze * 0.3) * 0.022) * (1.0 - alpha * 0.5) * (1.0 - 0.85 * inShadow);

  col *= u_intensity * 4.5;
  float peak = max(max(col.r, col.g), max(col.b, 1e-4));
  vec3 mapped = col * ((1.0 - exp(-peak * 1.25)) / peak);
  mapped = mix(mapped, u_color4 * (1.0 - exp(-peak * 1.25)), smoothstep(0.5, 3.5, peak) * 0.65);

  // Premultiplied output over a transparent page: light covers in proportion
  // to its brightness, the shadow covers fully. A non-black space color
  // makes the whole frame opaque, as in the original.
  vec3 c = clamp(dither(mapped), 0.0, 1.0);
  float space = step(0.002, max(max(u_color1.r, u_color1.g), u_color1.b));
  float a = max(max(max(c.r, c.g), c.b), max(captured, max(inShadow, space)));
  c = min(c + u_color1 * (1.0 - max(max(c.r, c.g), c.b)), vec3(a));
  gl_FragColor = vec4(c, a);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
};

/** A static picture of the same scene, for when WebGL isn't available. */
function StaticBlackHole({
  scale,
  x,
  y,
  colors,
}: Required<Pick<BlackHoleProps, "scale" | "x" | "y">> & { colors: Colors }) {
  const s = (v: number) => `${(v * scale).toFixed(2)}vmin`;
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute"
        style={{
          left: `${50 + x * 100}%`,
          top: `${50 - y * 100}%`,
          transform: "rotate(-18deg)",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: s(150),
            height: s(150),
            left: s(-75),
            top: s(-75),
            background: `radial-gradient(closest-side, ${rgba(colors[2], 0.22)}, transparent 70%)`,
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: s(200),
            height: s(14),
            left: s(-100),
            top: s(-7),
            background: `radial-gradient(closest-side, ${colors[3]} 0%, ${rgba(colors[2], 0.9)} 22%, ${rgba(colors[1], 0.7)} 50%, transparent 100%)`,
            filter: "blur(3px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: s(36),
            height: s(36),
            left: s(-18),
            top: s(-18),
            background: "#000",
            boxShadow: `0 0 0 ${s(0.5)} ${rgba(colors[3], 0.85)}, 0 0 ${s(4)} ${s(1)} ${rgba(colors[2], 0.55)}`,
          }}
        />
      </div>
    </div>
  );
}

type Mode = "pending" | "gl" | "static";

export function BlackHole({
  speed = 1,
  scale = 1,
  intensity = 1,
  tilt = 4,
  x = 0.34,
  y = 0.15,
  seed = 11,
  colors = DEFAULT_COLORS,
  maxDpr = 1.5,
  className = "",
  style,
}: BlackHoleProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("pending");
  // Latest props, read by the render loop without restarting it.
  const props = useRef({ speed, scale, intensity, tilt, x, y, seed, colors, maxDpr });
  const requestDraw = useRef<() => void>(() => {});

  // Hand new props to the loop; redraw the still frame under reduced motion.
  useEffect(() => {
    props.current = { speed, scale, intensity, tilt, x, y, seed, colors, maxDpr };
    requestDraw.current();
  }, [speed, scale, intensity, tilt, x, y, seed, colors, maxDpr]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    let ready = false;
    let onScreen = false;
    let frame = 0;
    let last = 0;
    let elapsed = 0;
    // Resolution adapts between these to keep frames under ~20 ms.
    let quality = 0.8;
    let slow = 0;
    let fast = 0;
    let disposed = false;

    const fail = () => {
      if (!disposed) setMode("static");
    };

    const init = () => {
      if (gl || disposed) return;
      // Software WebGL would ray-trace on the CPU: use the static picture instead.
      const ctx = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: true,
      });
      if (!ctx) return fail();
      gl = ctx;
      canvas.addEventListener("webglcontextlost", onLost);

      const compile = (type: number, src: string) => {
        const sh = ctx.createShader(type)!;
        ctx.shaderSource(sh, src);
        ctx.compileShader(sh);
        return sh;
      };
      const vs = compile(ctx.VERTEX_SHADER, VERT);
      const fs = compile(ctx.FRAGMENT_SHADER, FRAG);
      const prog = ctx.createProgram()!;
      ctx.attachShader(prog, vs);
      ctx.attachShader(prog, fs);
      ctx.linkProgram(prog);
      program = prog;

      // Let the driver compile in the background where it can, so the heavy
      // shader never blocks the main thread mid-scroll.
      const parallel = ctx.getExtension("KHR_parallel_shader_compile") as {
        COMPLETION_STATUS_KHR: number;
      } | null;
      const finish = () => {
        if (disposed || !gl) return;
        if (parallel && !ctx.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) {
          setTimeout(finish, 50);
          return;
        }
        if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) {
          console.warn("[BlackHole]", ctx.getShaderInfoLog(fs) || ctx.getProgramInfoLog(prog));
          return fail();
        }
        ctx.useProgram(prog);
        const buf = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
        // One triangle that covers the screen.
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW);
        const loc = ctx.getAttribLocation(prog, "a_pos");
        ctx.enableVertexAttribArray(loc);
        ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
        for (const n of [
          "u_time",
          "u_resolution",
          "u_color1",
          "u_color2",
          "u_color3",
          "u_color4",
          "u_scale",
          "u_intensity",
          "u_seed",
          "u_tilt",
          "u_x",
          "u_y",
        ]) {
          uniforms[n] = ctx.getUniformLocation(prog, n);
        }
        ready = true;
        setMode("gl");
        kick();
      };
      finish();
    };

    const resize = () => {
      if (!gl) return false;
      const p = props.current;
      const dpr = Math.min(window.devicePixelRatio || 1, p.maxDpr) * quality;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      return true;
    };

    const draw = (time: number) => {
      if (!gl || !ready || !resize()) return;
      const p = props.current;
      const u = uniforms;
      gl.uniform1f(u.u_time!, time);
      gl.uniform2f(u.u_resolution!, canvas.width, canvas.height);
      p.colors.forEach((c, i) => gl!.uniform3fv(u[`u_color${i + 1}`]!, hexToRgb(c)));
      gl.uniform1f(u.u_scale!, p.scale);
      gl.uniform1f(u.u_intensity!, p.intensity);
      gl.uniform1f(u.u_seed!, p.seed);
      gl.uniform1f(u.u_tilt!, p.tilt);
      gl.uniform1f(u.u_x!, p.x);
      gl.uniform1f(u.u_y!, p.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      frame = 0;
      if (!onScreen || document.hidden || disposed) return;
      const dt = last ? now - last : 16;
      last = now;
      elapsed += Math.min(dt, 100) / 1000;
      // Adaptive resolution: step down quickly when frames drag, up slowly.
      if (dt > 22) {
        fast = 0;
        if (++slow > 12 && quality > 0.5) {
          quality = Math.max(0.5, quality * 0.85);
          slow = 0;
        }
      } else if (dt < 15) {
        slow = 0;
        if (++fast > 120 && quality < 1) {
          quality = Math.min(1, quality * 1.08);
          fast = 0;
        }
      }
      draw(elapsed * props.current.speed);
      frame = requestAnimationFrame(loop);
    };

    const kick = () => {
      if (!ready) return;
      if (reduced) {
        draw(STILL_TIME * props.current.speed);
        return;
      }
      if (onScreen && !document.hidden && !frame) {
        last = 0;
        frame = requestAnimationFrame(loop);
      }
    };
    requestDraw.current = () => {
      if (reduced) kick();
    };

    function onLost(e: Event) {
      e.preventDefault();
      ready = false;
      cancelAnimationFrame(frame);
      fail();
    }

    // Compile well before the section arrives; draw only while it is on screen.
    const near = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          near.disconnect();
          init();
        }
      },
      { rootMargin: "1500px 0px" },
    );
    const visible = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      if (onScreen) kick();
    });
    near.observe(wrap);
    visible.observe(wrap);

    const onVisibility = () => kick();
    document.addEventListener("visibilitychange", onVisibility);
    const ro = new ResizeObserver(() => {
      if (reduced) kick();
    });
    ro.observe(canvas);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      near.disconnect();
      visible.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      if (gl && program) gl.deleteProgram(program);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      gl = null;
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`relative h-full w-full ${className}`}
      style={style}
      aria-hidden="true"
    >
      {mode === "static" ? (
        <StaticBlackHole scale={scale} x={x} y={y} colors={colors} />
      ) : (
        <canvas
          ref={canvasRef}
          className="block h-full w-full transition-opacity duration-1000"
          style={{ opacity: mode === "gl" ? 1 : 0 }}
        />
      )}
    </div>
  );
}

export default BlackHole;
