'use client';
import { useLeagueClock } from './league-clock';
import { announcedStart, formatCountdown, sessionState } from './session';
import type { EventInfo } from './racing';
import type { Entry } from './league';
// The only component that re-renders every second. Screen readers get a static
// description of the scheduled time instead of per-second announcements.
export function SessionCountdown({ event, data }: { event: EventInfo; data: Entry[] }) {
  const now = useLeagueClock();
  if (now === null) return <div className="session-countdown is-loading" aria-busy="true"><p className="eyebrow">Next session</p><p className="skeleton-line" /></div>;
  const state = sessionState(event, data, now);
  const announced = state.remaining === null && state.stage !== 'FINISHED' ? announcedStart(event, now) : null;
  const seconds = state.remaining ?? announced?.remaining ?? null;
  const title = state.remaining !== null ? state.notice : announced ? (announced.remaining ? 'ANNOUNCED START IN' : 'ANNOUNCED START') : state.notice;
  const detail = state.remaining !== null ? `Qualifying · ${state.scheduled}` : announced ? announced.label : state.scheduled;
  if (state.stage === 'FINISHED') return null;
  return <div className="session-countdown">
    <p className="eyebrow">{title}</p>
    {seconds !== null && <p className="session-digits"><span aria-hidden="true">{formatCountdown(seconds)}</span><span className="sr-only">Starts {detail}</span></p>}
    {detail && <p className="session-detail">{detail}</p>}
  </div>;
}
