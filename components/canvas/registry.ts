import type { Vector3 } from "three";
import type { SetId } from "@/lib/acts";

/** A camera shot: where the camera is, what it looks at, its field of view. */
export interface Shot {
  pos: Vector3;
  look: Vector3;
  fov: number;
}

/**
 * Each set registers a rig: given the local act time within the set, fill in
 * the shot. `rm` is true for prefers-reduced-motion (hold a still frame).
 */
export type RigFn = (local: number, shot: Shot, aspect: number, rm: boolean) => void;

export const rigs: Partial<Record<SetId, RigFn>> = {};

/** DOM labels for the architecture, positioned by the System set each frame. */
export const labelEls = new Map<string, HTMLElement>();
