"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type PerspectiveCamera } from "three";
import { setAt, type SetId } from "@/lib/acts";
import { director } from "@/lib/director";
import { damp } from "@/lib/math";
import { rigs, type Shot } from "./registry";

/**
 * Drives the camera from the active set's rig. Moves are damped for a heavy,
 * dolly-like feel; a change of set is a hard cut (the film transition hides it).
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const shot = useMemo<Shot>(() => ({ pos: new Vector3(), look: new Vector3(), fov: 38 }), []);
  const look = useRef(new Vector3());
  const lastSet = useRef<SetId | null>(null);
  const parallax = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const range = setAt(director.T);
    const rig = rigs[range.id];
    if (!rig) return;
    const dt = Math.min(delta, 0.1);
    const aspect = state.size.width / Math.max(1, state.size.height);
    rig(director.T - range.start, shot, aspect, director.reducedMotion);

    const par = parallax.current;
    if (!director.reducedMotion) {
      par.x = damp(par.x, director.pointer.x, 2.4, dt);
      par.y = damp(par.y, director.pointer.y, 2.4, dt);
      shot.pos.x += par.x * 0.32;
      shot.pos.y += par.y * 0.18;
    }

    const cut = range.id !== lastSet.current;
    lastSet.current = range.id;
    if (cut || director.reducedMotion) {
      camera.position.copy(shot.pos);
      look.current.copy(shot.look);
      camera.fov = shot.fov;
    } else {
      const l = 6;
      camera.position.set(
        damp(camera.position.x, shot.pos.x, l, dt),
        damp(camera.position.y, shot.pos.y, l, dt),
        damp(camera.position.z, shot.pos.z, l, dt),
      );
      look.current.set(
        damp(look.current.x, shot.look.x, l, dt),
        damp(look.current.y, shot.look.y, l, dt),
        damp(look.current.z, shot.look.z, l, dt),
      );
      camera.fov = damp(camera.fov, shot.fov, l, dt);
    }
    camera.lookAt(look.current);
    camera.updateProjectionMatrix();
  });

  return null;
}
