'use client';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { createLeagueClock } from '../lib/league-clock';
const clock = createLeagueClock({
  wall: () => Date.now(), mono: () => performance.now(),
  server: async () => {
    const response = await fetch('/api/time', { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Error('Clock unavailable');
    const data = await response.json() as { now: number };
    return data.now;
  },
  interval: (fn, ms) => setInterval(fn, ms), clear: id => clearInterval(id),
});
const subscribe = (fn: () => void) => clock.subscribe(fn);
const serverSnapshot = () => null;
// All callers share one sync and one tick interval. `resolution` quantises the
// returned time so a component re-renders only when that unit changes: the
// countdown uses seconds; race-week/stage selection only needs minutes, because
// every league boundary (Wednesday 00:00, 21:00 qualifying, Monday rollover)
// falls exactly on a minute.
export function useLeagueClock(resolution = 1000) {
  const snapshot = useCallback(() => {
    const now = clock.snapshot();
    return now === null ? null : now - (now % resolution);
  }, [resolution]);
  const now = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(() => {
    const resume = () => { if (document.visibilityState === 'visible') clock.resume(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    return () => { document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', resume); };
  }, []);
  return now;
}
export const MINUTE = 60000;
