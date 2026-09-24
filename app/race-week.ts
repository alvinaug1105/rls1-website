// Pure race-week presentation data. Every value is derived from the existing
// league rules (eventStatus, publishedDuel, classification) so UI components
// never re-implement race logic and nothing is inferred beyond published data.
import type { Entry, Row } from './league';
import {
  calculateStandings,
  classification,
  driverId as id,
  eventStatus,
  raceEntries,
  raceWeekWindow,
  type EventInfo,
} from './racing';
import {
  duelBracket,
  duelFastest,
  duelSeeds,
  publishedDuel,
  qualifyingFor,
} from './duel';
import { fastestDuel, sortQual } from './result-utils';
import { roundNumber, schedule } from './season';

export type StageState = 'completed' | 'current' | 'upcoming';
export type StageId = 'qualifying' | 'duel' | 'race';
export type Stage = { id: StageId; label: string; state: StageState };

export const stageStateLabel: Record<StageState, string> = {
  completed: 'Completed',
  current: 'Current',
  upcoming: 'Upcoming',
};

// Duel counts as complete only when its published bracket has a final winner.
export function duelComplete(data: Entry[], round: number) {
  const record = publishedDuel(data, round);
  return (
    !!record &&
    !!duelBracket(duelSeeds(data, round), record.winners).at(-1)?.winner
  );
}

export function raceWeekStages(
  event: EventInfo,
  data: Entry[],
  now?: number,
): Stage[] {
  const stage = eventStatus(event, data, now);
  const published = {
    qualifying: !!qualifyingFor(data, event.round),
    duel: duelComplete(data, event.round),
    race: stage === 'FINISHED',
  };
  const current: Record<StageId, boolean> = {
    qualifying: stage === 'QUALIFYING',
    duel: stage === 'DUEL',
    race: stage === 'RACE' || stage === 'LIVE',
  };
  return (['qualifying', 'duel', 'race'] as const).map((id) => ({
    id,
    label: id === 'qualifying' ? 'Qualifying' : id === 'duel' ? 'Duel' : 'Race',
    state: published[id] ? 'completed' : current[id] ? 'current' : 'upcoming',
  }));
}

// Deterministic calendar labels for server-rendered markup. Intl output differs
// between the Worker's ICU and each browser (e.g. "Wed 16 Sept" vs
// "Wed, 16 Sept"), which breaks hydration; fixed names never shift.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dayLabel(date: string, year = false) {
  const d = new Date(`${date}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ''}`;
}
// "Wed 16 Sep – Sun 20 Sep 2026" in league (Hong Kong) dates.
export function raceWeekLabel(event: EventInfo) {
  const { end } = raceWeekWindow(event);
  const sunday = new Date(end - 86400000 + 8 * 3600000).toISOString().slice(0, 10);
  return `${dayLabel(event.date)} – ${dayLabel(sunday, true)}`;
}

export type RoundSummary = {
  round: number;
  country: string;
  qualifying: Row[];
  pole?: Row;
  duelWinner?: Row;
  duelStale: boolean;
  race: Row[];
  raceWinner?: Row;
  // The race classification's recorded best Duel lap (archive rounds and the
  // race editor store it there); otherwise the published Duel bracket's laps.
  fastestLap?: { driver: string; team: string; ms: number; source: 'race' | 'duel' };
  decisions: number;
};

export function roundSummary(data: Entry[], round: number): RoundSummary {
  const qualifying = sortQual(classification(qualifyingFor(data, round)));
  const raceEntry = raceEntries(data).find((e) => roundNumber(e.title) === round);
  const race = classification(raceEntry);
  const seeds = duelSeeds(data, round);
  const duel = publishedDuel(data, round);
  const duelWinner = duel
    ? duelBracket(seeds, duel.winners).at(-1)?.winner
    : undefined;
  const raceFastest = fastestDuel(race);
  const duelLap = duelFastest(duel);
  const duelLapRow = duelLap && seeds.find((s) => s.driver === duelLap[0]);
  return {
    round,
    country: schedule[round - 1]?.country ?? '',
    qualifying,
    pole: qualifying[0],
    duelWinner,
    duelStale:
      !duel &&
      data.some(
        (e) => e.kind === 'duel' && e.approved === 1 && roundNumber(e.title) === round,
      ),
    race,
    raceWinner: race[0],
    fastestLap: raceFastest?.duelMs
      ? {
          driver: raceFastest.driver,
          team: raceFastest.team,
          ms: raceFastest.duelMs,
          source: 'race',
        }
      : duelLap
        ? {
            driver: duelLap[0],
            team: duelLapRow?.team ?? '',
            ms: duelLap[1],
            source: 'duel',
          }
        : undefined,
    decisions: data.filter(
      (e) => e.approved === 1 && e.kind === 'penalty' && roundNumber(e.title) === round,
    ).length,
  };
}

// Championship leader after a given round, from the shared standings rules.
export function leaderThrough(data: Entry[], round: number) {
  return calculateStandings(
    data.filter((e) => e.kind !== 'race' || roundNumber(e.title) <= round),
  )[0];
}

export type DriverStats = {
  name: string;
  team: string;
  position?: number;
  points: number;
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  duelWins: number;
  bestFinish?: number;
  bestQualifying?: number;
  results: { round: number; position: number; points: number; team: string }[];
};

// Driver identity follows the existing canonical-name rules (e.g. Shawn and
// Atlegang are one driver). Statistics count published classifications only.
export function driverStats(data: Entry[], name: string): DriverStats {
  const standing = calculateStandings(data).find((r) => id(r.name) === id(name));
  const results = raceEntries(data).flatMap((e) =>
    classification(e).flatMap((r, i) =>
      id(r.driver) === id(name)
        ? [{ round: roundNumber(e.title), position: i + 1, points: r.points, team: r.team }]
        : [],
    ),
  );
  const qualifyingRounds = data.filter(
    (e) => e.approved === 1 && e.kind === 'qualifying',
  );
  const qualifyingPositions = qualifyingRounds.flatMap((e) => {
    const index = sortQual(classification(e)).findIndex(
      (r) => id(r.driver) === id(name),
    );
    return index < 0 ? [] : [index + 1];
  });
  const rounds = [
    ...new Set(
      data
        .filter((e) => e.approved === 1 && e.kind === 'duel')
        .map((e) => roundNumber(e.title)),
    ),
  ];
  return {
    name,
    team: standing?.team ?? results.at(-1)?.team ?? '',
    position: standing?.position,
    points: standing?.points ?? 0,
    starts: results.length,
    wins: standing?.wins ?? 0,
    podiums: standing?.podiums ?? 0,
    poles: qualifyingPositions.filter((p) => p === 1).length,
    fastestLaps: raceEntries(data).filter(
      (e) => id(fastestDuel(classification(e))?.driver || '') === id(name),
    ).length,
    duelWins: rounds.filter((round) => {
      const winner = roundSummary(data, round).duelWinner;
      return winner && id(winner.driver) === id(name);
    }).length,
    bestFinish: results.length
      ? Math.min(...results.map((r) => r.position))
      : undefined,
    bestQualifying: qualifyingPositions.length
      ? Math.min(...qualifyingPositions)
      : undefined,
    results,
  };
}
