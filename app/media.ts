import type { Entry } from './league';
import { classification, calculateStandings, raceEntries } from './racing';
import { roundNumber } from './season';
import { qualifyingFor, publishedDuel, duelSeeds } from './duel';
import { roundSummary } from './race-week';
import { drawResultGraphic, qualifyingGraphic, raceGraphic, recapGraphic, standingsGraphic, drawDuelGraphic } from './result-png';
export const graphicFilename = (round: number, id: string) => `RLS1-S1-R${String(round).padStart(2, '0')}-${id}.png`;
// Official graphics for one round. Availability mirrors published data only;
// championship graphics include races through the selected round.
export function mediaGraphics(data: Entry[], round: number) {
  const q = qualifyingFor(data, round), duel = publishedDuel(data, round);
  const race = raceEntries(data).find(e => roundNumber(e.title) === round);
  const through = data.filter(e => e.kind !== 'race' || roundNumber(e.title) <= round);
  const races = raceEntries(through);
  const summary = roundSummary(data, round);
  const leader = calculateStandings(through)[0];
  return [
    { id: 'qualifying', label: 'Qualifying', available: !!q && classification(q).length > 0, draw: (c: HTMLCanvasElement) => drawResultGraphic(c, qualifyingGraphic(round, classification(q))) },
    { id: 'duel', label: 'Duel', available: !!duel, draw: (c: HTMLCanvasElement) => drawDuelGraphic(c, round, duelSeeds(data, round), duel) },
    { id: 'race', label: 'Race Result', available: !!race && classification(race).length > 0, draw: (c: HTMLCanvasElement) => drawResultGraphic(c, raceGraphic(round, classification(race))) },
    ...[false, true].map(teams => ({ id: teams ? 'wcc' : 'wdc', label: teams ? 'Teams Championship' : 'Drivers Championship', available: races.length > 0, draw: (c: HTMLCanvasElement) => drawResultGraphic(c, standingsGraphic(calculateStandings(through, teams), teams, races.length, round)) })),
    { id: 'recap', label: 'Round Recap', available: !!race && classification(race).length > 0, draw: (c: HTMLCanvasElement) => drawResultGraphic(c, recapGraphic(round, { pole: summary.pole, duelWinner: summary.duelWinner, raceWinner: summary.raceWinner, fastestLap: summary.fastestLap, leader })) },
  ];
}
