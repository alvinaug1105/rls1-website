import { canonical, roundNumber, schedule } from './season';
import { fastestDuel, formatLap, sortQual, gap } from './result-utils';
import type { Entry, Row } from './league';

export const driverId = (name: string) => canonical(name).toLowerCase();
export function classification(entry?: Entry): Row[] {
  if (!entry) return [];
  try {
    const rows = JSON.parse(entry.body);
    return Array.isArray(rows)
      ? rows.filter(
          (r) =>
            r && typeof r.driver === 'string' && typeof r.team === 'string',
        )
      : [];
  } catch {
    return [];
  }
}
export function raceEntries(data: Entry[], through = 24) {
  return data
    .filter(
      (e) => e.approved && e.kind === 'race' && roundNumber(e.title) <= through,
    )
    .sort((a, b) => roundNumber(a.title) - roundNumber(b.title));
}
export type Standing = {
  name: string;
  team: string;
  points: number;
  wins: number;
  podiums: number;
  starts: number;
  position: number;
  gap: number;
  change: number | null;
};
function totals(data: Entry[], through: number, teams: boolean): Standing[] {
  const map = new Map<string, Standing>();
  for (const race of raceEntries(data, through))
    classification(race).forEach((r, i) => {
      const name = teams ? r.team : canonical(r.driver),
        id = teams ? name : driverId(name);
      const old = map.get(id) || {
        name,
        team: r.team,
        points: 0,
        wins: 0,
        podiums: 0,
        starts: 0,
        position: 0,
        gap: 0,
        change: null,
      };
      map.set(id, {
        ...old,
        team: r.team,
        points: old.points + (Number.isFinite(r.points) ? r.points : 0),
        wins: old.wins + (i === 0 ? 1 : 0),
        podiums: old.podiums + (i < 3 ? 1 : 0),
        starts: old.starts + 1,
      });
    });
  const rows = [...map.values()].sort(
    (a, b) => b.points - a.points || a.name.localeCompare(b.name),
  );
  return rows.map((r, i) => ({
    ...r,
    position: i + 1,
    gap: rows[0].points - r.points,
  }));
}
export function calculateStandings(data: Entry[], teams = false): Standing[] {
  const rounds = raceEntries(data).map((e) => roundNumber(e.title)),
    last = Math.max(0, ...rounds),
    previous = totals(data, last - 1, teams);
  return totals(data, last, teams).map((r) => ({
    ...r,
    change:
      rounds.length > 1
        ? (previous.find((p) => p.name === r.name)?.position ?? 0)
          ? previous.find((p) => p.name === r.name)!.position - r.position
          : null
        : null,
  }));
}
export function progression(data: Entry[]) {
  const rounds = raceEntries(data).map((e) => roundNumber(e.title));
  return rounds.map((round) => ({
    round,
    standings: totals(data, round, false),
  }));
}
export type EventInfo = {
  round: number;
  country: string;
  date: string;
  flag: string;
  startAt?: string;
  status?: 'UPCOMING' | 'QUALIFYING' | 'LIVE';
  notes?: string;
};
export function events(data: Entry[]): EventInfo[] {
  return schedule.map((s) => {
    const e = data.find(
      (e) =>
        e.approved && e.kind === 'event' && roundNumber(e.title) === s.round,
    );
    if (!e) return s;
    try {
      const v = JSON.parse(e.body);
      return {
        ...s,
        date: v.date || s.date,
        startAt: v.startAt || undefined,
        status: v.status || undefined,
        notes: v.notes || '',
      };
    } catch {
      return s;
    }
  });
}
export const RACE_TIME_ZONE = 'Asia/Hong_Kong';
const raceClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: RACE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});
export function raceDayClock(now: number) {
  const parts = raceClock.formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    hour: Number(part('hour')),
  };
}
export function eventStatus(event: EventInfo, data: Entry[], now?: number) {
  if (
    data.some(
      (e) =>
        e.approved === 1 &&
        e.kind === 'race' &&
        roundNumber(e.title) === event.round,
    )
  )
    return 'FINISHED';
  // Explicit live racing must never be moved backwards by the qualifying clock.
  if (event.status === 'LIVE') return 'LIVE';
  if (now !== undefined) {
    const clock = raceDayClock(now);
    if (event.date === clock.date && clock.hour >= 21) return 'QUALIFYING';
  }
  if (event.status && event.status !== 'UPCOMING') return event.status;
  if (
    !event.status &&
    data.some(
      (e) =>
        e.approved === 1 &&
        e.kind === 'qualifying' &&
        roundNumber(e.title) === event.round,
    )
  )
    return 'QUALIFYING';
  if (now !== undefined && event.date === raceDayClock(now).date)
    return 'RACE DAY';
  return 'UPCOMING';
}
export function nextEvent(data: Entry[], now: number) {
  const today = raceDayClock(now).date;
  const ordered = events(data).sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.startAt || '').localeCompare(b.startAt || '') ||
      a.round - b.round,
  );
  // Keep today's event even after its start time or official completion.
  // Advance only when the Hong Kong calendar date changes.
  return (
    ordered.find((e) => e.date === today) ||
    ordered.find(
      (e) => e.date > today && eventStatus(e, data, now) !== 'FINISHED',
    )
  );
}
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date + 'T12:00:00Z'));
}
export function raceRecap(round: number, rows: Row[]) {
  const best = fastestDuel(rows);
  return `🏁 RLS1 — ROUND ${String(round).padStart(2, '0')} · ${schedule[round - 1].country}\n\nRACE RESULTS\n\n${rows.map((r, i) => `P${i + 1} ${r.driver} — ${r.team} — ${r.points} pts`).join('\n')}${best ? `\n\nFastest duel lap: ${best.driver} — ${formatLap(best.duelMs!)}` : ''}`;
}
export function qualifyingRecap(
  round: number,
  rows: import('./result-utils').QualRow[],
) {
  const sorted = sortQual(rows);
  return `🏁 RLS1 — ROUND ${String(round).padStart(2, '0')} · ${schedule[round - 1].country}\n\nQUALIFYING RESULTS\n\n${sorted.map((r, i) => `P${i + 1} ${r.driver} — ${r.team || '—'} — ${r.ms ? formatLap(r.ms) : '—'}${i && r.ms && sorted[0].ms ? ` (${gap(r.ms, sorted[0].ms)})` : ''}`).join('\n')}`;
}
export function standingsRecap(data: Entry[], teams = false) {
  return `🏆 RLS1 — ${teams ? 'TEAM' : 'DRIVER'} STANDINGS\n\n${calculateStandings(
    data,
    teams,
  )
    .map(
      (r) =>
        `P${r.position} ${r.name} — ${r.points} pts${r.gap ? ` (${r.gap} behind)` : ' — Leader'}`,
    )
    .join('\n')}`;
}
const escapeICS = (text: string) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
const utc = (n: number) =>
  new Date(n)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
export function calendarFile(items: EventInfo[], now = Date.now()) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RLS1//Season Calendar//EN',
    'CALSCALE:GREGORIAN',
    ...items.flatMap((e) => [
      'BEGIN:VEVENT',
      `UID:rls1-s1-r${e.round}@rls1`,
      `DTSTAMP:${utc(now)}`,
      ...(e.startAt
        ? [`DTSTART:${utc(Date.parse(e.startAt))}`]
        : [
            `DTSTART;VALUE=DATE:${e.date.replaceAll('-', '')}`,
            `DTEND;VALUE=DATE:${new Date(Date.parse(e.date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10).replaceAll('-', '')}`,
          ]),
      `SUMMARY:${escapeICS(`RLS1 R${e.round} - ${e.country}`)}`,
      `DESCRIPTION:${escapeICS(e.startAt ? 'Race start. Check race control for updates.' : 'Season date only; start time to be announced.')}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  // Fold at <= 75 UTF-8 octets without splitting a code point (RFC 5545).
  return (
    lines
      .map((line) => {
        let out = '',
          part = '';
        for (const ch of line) {
          if (new TextEncoder().encode(part + ch).length > 75) {
            out += part + '\r\n';
            part = ' ';
          }
          part += ch;
        }
        return out + part;
      })
      .join('\r\n') + '\r\n'
  );
}
export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
