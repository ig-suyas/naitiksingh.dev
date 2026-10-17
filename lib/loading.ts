/**
 * Weighted loading tracker that drives the film-leader countdown with real
 * progress: fonts, window load, the 3D chunk, textures and shader compile.
 */
type Listener = (p: number) => void;

const tasks = new Map<string, { weight: number; progress: number }>();
const listeners = new Set<Listener>();

function emit() {
  const p = overall();
  for (const fn of listeners) fn(p);
}

export function overall() {
  let total = 0;
  let done = 0;
  for (const t of tasks.values()) {
    total += t.weight;
    done += t.weight * t.progress;
  }
  return total ? done / total : 0;
}

export const loading = {
  add(key: string, weight = 1) {
    if (!tasks.has(key)) tasks.set(key, { weight, progress: 0 });
    emit();
  },
  progress(key: string, p: number) {
    const t = tasks.get(key);
    if (!t) return;
    t.progress = Math.max(t.progress, Math.min(1, p));
    emit();
  },
  done(key: string) {
    loading.progress(key, 1);
  },
  remove(key: string) {
    tasks.delete(key);
    emit();
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    fn(overall());
    return () => {
      listeners.delete(fn);
    };
  },
};
