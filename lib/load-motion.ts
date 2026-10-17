/** Keeps motion's animation engine out of first load; <LazyMotion> fetches it when needed. */
export const loadMotionFeatures = () => import("./motion-features").then((m) => m.default);
