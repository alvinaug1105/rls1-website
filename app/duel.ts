import type { Entry, Row } from './league';
import { canonical, roundNumber, schedule } from './season';
import { sortQual } from './result-utils';
import { validateClassification } from './validation';
export const matchIds = [
  'QF1',
  'QF2',
  'QF3',
  'QF4',
  'SF1',
  'SF2',
  'FINAL',
] as const;
export type MatchId = (typeof matchIds)[number];
export type DuelRecord = {
  round: number;
  qualifyingBody: string;
  winners: Partial<Record<MatchId, string>>;
  laps: Record<string, number>;
};
export type DuelMatch = {
  id: MatchId;
  players: Row[];
  ready: boolean;
  winner?: Row;
  bye: boolean;
};
export function qualifyingFor(data: Entry[], round: number) {
  return data.find(
    (e) =>
      e.approved === 1 &&
      e.kind === 'qualifying' &&
      roundNumber(e.title) === round,
  );
}
export function duelSeeds(data: Entry[], round: number): Row[] {
  const q = qualifyingFor(data, round);
  if (!q) return [];
  try {
    const rows = JSON.parse(q.body);
    validateClassification('qualifying', rows);
    return sortQual(rows as Row[]).slice(0, 8);
  } catch {
    return [];
  }
}
export function duelBracket(
  seeds: Row[],
  winners: DuelRecord['winners'] = {},
): DuelMatch[] {
  const matches: DuelMatch[] = [];
  function add(id: MatchId, players: Row[], ready: boolean) {
    const bye = ready && players.length === 1;
    const winner = bye
      ? players[0]
      : ready
        ? players.find((p) => p.driver === winners[id])
        : undefined;
    matches.push({ id, players, ready, bye, winner });
  }
  for (const [i, pair] of [
    [0, 7],
    [3, 4],
    [1, 6],
    [2, 5],
  ].entries())
    add(
      matchIds[i],
      pair.flatMap((n) => (seeds[n] ? [seeds[n]] : [])),
      seeds.length >= 2,
    );
  function advance(id: MatchId, a: number, b: number) {
    const sources = [matches[a], matches[b]];
    add(
      id,
      sources.flatMap((m) => (m.winner ? [m.winner] : [])),
      sources.every((m) => m.ready && (m.players.length === 0 || !!m.winner)),
    );
  }
  advance('SF1', 0, 1);
  advance('SF2', 2, 3);
  advance('FINAL', 4, 5);
  return matches;
}
export function validateDuel(
  value: unknown,
  data: Entry[],
  round: number,
): DuelRecord {
  if (!Number.isInteger(round) || !schedule.some((e) => e.round === round))
    throw Error('Choose a valid round.');
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid Duel record.');
  const v = value as DuelRecord;
  const q = qualifyingFor(data, round),
    seeds = duelSeeds(data, round);
  if (!q || seeds.length < 2)
    throw Error(
      'Publish a complete qualifying classification with at least two drivers first.',
    );
  if (
    new Set(seeds.map((r) => canonical(r.driver).toLowerCase())).size !==
    seeds.length
  )
    throw Error('Duplicate qualifying drivers.');
  if (v.round !== round || v.qualifyingBody !== q.body)
    throw Error('Qualifying changed. Reload the bracket before publishing.');
  if (
    !v.winners ||
    typeof v.winners !== 'object' ||
    Array.isArray(v.winners) ||
    !v.laps ||
    typeof v.laps !== 'object' ||
    Array.isArray(v.laps)
  )
    throw Error('Invalid Duel results.');
  const bracket = duelBracket(seeds, v.winners);
  for (const [id, winner] of Object.entries(v.winners)) {
    const match = bracket.find((m) => m.id === id);
    if (
      !match ||
      typeof winner !== 'string' ||
      !match.ready ||
      !match.players.some((p) => p.driver === winner)
    )
      throw Error(
        `Invalid winner for ${id}; resolve its preceding matches first.`,
      );
  }
  for (const [driver, ms] of Object.entries(v.laps)) {
    if (
      !seeds.some((p) => p.driver === driver) ||
      !Number.isSafeInteger(ms) ||
      ms <= 0 ||
      ms > 3599999
    )
      throw Error(
        'Choose a qualified driver and valid duel lap time (under 60 minutes).',
      );
  }
  return v;
}
export function publishedDuel(
  data: Entry[],
  round: number,
): DuelRecord | undefined {
  const entry = data.find(
    (e) =>
      e.approved === 1 && e.kind === 'duel' && roundNumber(e.title) === round,
  );
  try {
    return entry
      ? validateDuel(JSON.parse(entry.body), data, round)
      : undefined;
  } catch {
    return undefined;
  }
}
export function duelFastest(record?: DuelRecord) {
  return record
    ? Object.entries(record.laps).sort((a, b) => a[1] - b[1])[0]
    : undefined;
}
