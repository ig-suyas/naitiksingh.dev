import type { Tier } from "./director";

interface NavigatorExtras {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/**
 * Decide how much film the device can project.
 *  high   → full 3D + post-processing (desktop-class GPUs)
 *  medium → lighter 3D (phones, tablets, modest laptops), loaded lazily
 *  low    → cinematic 2D fallback (no WebGL, software rendering, save-data)
 * `?2d` / `?3d` in the URL force a mode for testing.
 */
export function detectTier(): { tier: Tier; reason: string } {
  const params = new URLSearchParams(window.location.search);
  if (params.has("2d")) return { tier: "low", reason: "forced" };

  const nav = navigator as Navigator & NavigatorExtras;
  if (nav.connection?.saveData && !params.has("3d")) return { tier: "low", reason: "save-data" };

  const probe = probeWebGL();
  if (!probe.ok) return { tier: "low", reason: "no-webgl" };
  if (probe.software && !params.has("3d")) return { tier: "low", reason: "software-gl" };

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  if ((cores <= 2 || memory <= 2) && !params.has("3d")) return { tier: "low", reason: "low-power" };

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 900;
  if (params.has("3d") && !coarse) return { tier: "high", reason: "forced" };
  if (coarse || narrow || cores <= 4 || memory < 4) return { tier: "medium", reason: "mobile" };
  return { tier: "high", reason: "desktop" };
}

function probeWebGL(): { ok: boolean; software: boolean } {
  try {
    const canvas = document.createElement("canvas");
    const strict = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    const gl = strict ?? canvas.getContext("webgl2");
    if (!gl) return { ok: false, software: false };
    let software = !strict;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info) {
      const renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
      if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) software = true;
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { ok: true, software };
  } catch {
    return { ok: false, software: false };
  }
}
