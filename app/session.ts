import { eventStatus, raceWeekWindow, RACE_TIME_ZONE, type EventInfo } from './racing';
import type { Entry } from './league';
export function sessionState(event: EventInfo, data: Entry[], now: number) {
  const stage = eventStatus(event, data, now);
  const start = raceWeekWindow(event).qualifyingAt;
  const scheduled = new Intl.DateTimeFormat('en-GB', { timeZone: RACE_TIME_ZONE, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(start) + ' HKT';
  const remaining = Math.max(0, Math.ceil((start - now) / 1000));
  if (stage === 'FINISHED') return { stage, remaining: null, notice: 'COMPLETED', scheduled: '' };
  if (!['UPCOMING', 'RACE WEEK', 'QUALIFYING'].includes(stage)) return { stage, remaining: null, notice: `${stage} · Current stage`, scheduled: 'Next session time to be announced' };
  if (now >= start || stage === 'QUALIFYING') return { stage, remaining: null, notice: now >= start && now < start + 60000 ? 'QUALIFYING · STARTING NOW' : `${stage} · Session started`, scheduled };
  return { stage, remaining, scheduled, notice: remaining > 86400 ? 'QUALIFYING · Scheduled' : remaining <= 900 ? 'QUALIFYING STARTS SOON' : remaining <= 3600 ? `QUALIFYING STARTS IN ${Math.ceil(remaining / 60)} MIN` : 'QUALIFYING STARTS IN' };
}
