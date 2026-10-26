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

/** Leader lines from each architecture label to its block. */
export const leaderEls = new Map<string, HTMLElement>();
/** Rendered label heights (kept current by a ResizeObserver, never read per frame). */
export const labelHeights = new Map<string, number>();

/** Which column each architecture label sits in (left blocks left, right blocks right). */
export const LABEL_SIDE: Record<string, "left" | "right"> = {
  frontend: "left",
  auth: "left",
  queue: "left",
  db: "left",
  gateway: "right",
  orders: "right",
  catalog: "right",
  cache: "right",
  platform: "right",
};
/**
 * Label column width and its gap to the diagram, in px. From xl up the labels
 * are 30% larger, like the diagram (see .node-label in globals.css); the right
 * column holds the longest title ("Catalog service").
 */
export const labelCol = (vw: number, side: "left" | "right") =>
  vw >= 1280 ? (side === "left" ? 180 : 196) : 168;
export const LABEL_GAP = 20;
/** How much the framed diagram may grow past the rig's own shot. */
export const ARCH_GROW = 1.3;
/** Minimum space between two labels in a column, in px. */
export const LABEL_SPACING = 8;

/**
 * The clear space Act II's diagram may use, in viewport px while the act is
 * pinned (measured by BuildAct on resize). `columns` places labels in two
 * columns beside the diagram; otherwise BuildAct shows a plain list instead.
 */
export const archFrame = {
  ready: false,
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  columns: true,
  /** Document y of the bottom of the Build section (the pinned copy leaves after it). */
  sectionBottom: 0,
};
