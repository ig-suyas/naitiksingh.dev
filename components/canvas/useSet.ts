import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { setAt, type SetId } from "@/lib/acts";
import { director } from "@/lib/director";
import { rigs, type RigFn } from "./registry";

/**
 * Registers a set's camera rig and keeps its root group visible only while
 * the film is on that set (or while shaders are being pre-compiled).
 */
export function useSet(id: SetId, rig: RigFn) {
  const ref = useRef<Group>(null);

  useEffect(() => {
    rigs[id] = rig;
    return () => {
      if (rigs[id] === rig) delete rigs[id];
    };
  }, [id, rig]);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.visible = director.compiling || setAt(director.T).id === id;
  });

  return ref;
}
