import { eventStatus, raceWeekWindow, RACE_TIME_ZONE, type EventInfo } from './racing';
import type { Entry } from './league';
const hkt = new Intl.DateTimeFormat('en-GB', { timeZone: RACE_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const hktLabel = (ms: number) => `${hkt.format(ms)} HKT`;
export function sessionState(event: EventInfo, data: Entry[], now: number) {
  const stage = eventStatus(event, data, now);
  const start = raceWeekWindow(event).qualifyingAt;
  const scheduled = hktLabel(start);
  const remaining = Math.max(0, Math.ceil((start - now) / 1000));
  if (stage === 'FINISHED') return { stage, remaining: null, notice: 'COMPLETED', scheduled: '' };
  if (!['UPCOMING', 'RACE WEEK', 'QUALIFYING'].includes(stage)) return { stage, remaining: null, notice: `${stage} · Current stage`, scheduled: 'Next session time to be announced' };
  if (now >= start || stage === 'QUALIFYING') return { stage, remaining: null, notice: now >= start && now < start + 60000 ? 'QUALIFYING · STARTING NOW' : `${stage} · Session started`, scheduled };
  return { stage, remaining, scheduled, notice: remaining > 86400 ? 'QUALIFYING · Scheduled' : remaining <= 900 ? 'QUALIFYING STARTS SOON' : remaining <= 3600 ? `QUALIFYING STARTS IN ${Math.ceil(remaining / 60)} MIN` : 'QUALIFYING STARTS IN' };
}
// An organiser-confirmed event start (EventInfo.startAt). Only Qualifying has a
// fixed league time; Duel and Race times are never inferred, so this is shown
// as "announced start" only when race control has actually published one.
export function announcedStart(event: EventInfo, now: number) {
  const at = event.startAt ? Date.parse(event.startAt) : NaN;
  if (!Number.isFinite(at)) return null;
  return { at, label: hktLabel(at), remaining: at > now ? Math.ceil((at - now) / 1000) : null };
}
export function formatCountdown(seconds: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const days = Math.floor(seconds / 86400);
  const clock = `${pad(Math.floor((seconds % 86400) / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  return days ? `${days}d ${clock}` : clock;
}
