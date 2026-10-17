"use client";

import { useMemo } from "react";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Vector2 } from "three";
import type { Tier } from "@/lib/director";

/**
 * Lens: bloom for every emissive edge, radial chromatic aberration at the
 * frame edges (desktop only), filmic tone mapping. Grain, vignette and leaks
 * live in the DOM so the 2D fallback shares them.
 */
export function Effects({ tier }: { tier: Tier }) {
  const offset = useMemo(() => new Vector2(0.0012, 0.0009), []);

  if (tier === "high") {
    return (
      <EffectComposer multisampling={4} enableNormalPass={false} stencilBuffer={false}>
        <Bloom
          mipmapBlur
          intensity={1.1}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.2}
          radius={0.72}
          levels={7}
        />
        <ChromaticAberration offset={offset} radialModulation modulationOffset={0.3} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer
      multisampling={0}
      enableNormalPass={false}
      stencilBuffer={false}
      resolutionScale={0.75}
    >
      <Bloom
        mipmapBlur
        intensity={1}
        luminanceThreshold={0.8}
        luminanceSmoothing={0.2}
        radius={0.65}
        levels={5}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
