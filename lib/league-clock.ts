// One clock per browser module instance; subscribers share sync and tick timers.
export function createLeagueClock(runtime: {
  wall: () => number;
  mono: () => number;
  server: () => Promise<number>;
  interval: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  clear: (id: ReturnType<typeof setInterval>) => void;
}) {
  let reference: { time: number; mono: number } | null = null;
  let snapshot: number | null = null;
  let lastAttempt = -Infinity;
  let pending: Promise<void> | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<() => void>();
  const correctedNow = () => reference ? reference.time + Math.max(0, runtime.mono() - reference.mono) : runtime.wall();
  function tick() { snapshot = correctedNow(); listeners.forEach(fn => fn()); }
  function sync() {
    if (pending) return pending;
    lastAttempt = runtime.mono();
    const start = runtime.mono();
    pending = (async () => {
      try {
        const server = await runtime.server();
        const end = runtime.mono();
        if (!Number.isFinite(server) || server <= 0 || end - start > 10000) throw Error('Invalid clock reference');
        // Timestamp is sampled by the server near response generation.
        reference = { time: server + (end - start) / 2, mono: end };
      } catch { /* Keep the last trusted reference, or the device fallback. */ }
      finally { pending = null; tick(); }
    })();
    return pending;
  }
  function resume() { tick(); if (runtime.mono() - lastAttempt >= 60000) void sync(); }
  return {
    now: correctedNow,
    snapshot: () => snapshot,
    sync,
    resume,
    subscribe(fn: () => void) {
      listeners.add(fn);
      if (!timer) {
        void sync();
        timer = runtime.interval(() => { tick(); if (runtime.mono() - lastAttempt >= (reference ? 300000 : 60000)) void sync(); }, 1000);
      }
      return () => { listeners.delete(fn); if (!listeners.size && timer) { runtime.clear(timer); timer = undefined; } };
    },
  };
}
