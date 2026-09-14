'use client';
import { useEffect, useSyncExternalStore } from 'react';
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
export function useLeagueClock() {
  const now = useSyncExternalStore(subscribe, clock.snapshot, serverSnapshot);
  useEffect(() => {
    const resume = () => { if (document.visibilityState === 'visible') clock.resume(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    return () => { document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', resume); };
  }, []);
  return now;
}
