'use client';
import { useClock } from './race-ui';
import { sessionState } from './session';
import type { EventInfo } from './racing';
import type { Entry } from './league';
export function SessionCountdown({ event, data }: { event: EventInfo; data: Entry[] }) {
  const now = useClock();
  if (now === null) return <p className="muted">Loading session schedule…</p>;
  const state = sessionState(event, data, now);
  const seconds = state.remaining;
  return <div className="session-countdown" aria-live="off">
    <p className="eyebrow">{state.notice}</p>
    {seconds !== null && seconds <= 86400 && <p className="session-digits" aria-label={`Qualifying starts ${state.scheduled}`}>
      {String(Math.floor(seconds / 3600)).padStart(2, '0')} : {String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')} : {String(seconds % 60).padStart(2, '0')}
    </p>}
    {state.scheduled && <p className="muted">{state.scheduled}</p>}
  </div>;
}
