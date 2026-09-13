import type { Entry } from './league';
import { classification, calculateStandings, raceEntries } from './racing';
import { roundNumber } from './season';
import { qualifyingFor, publishedDuel, duelSeeds } from './duel';
import { drawResultGraphic, qualifyingGraphic, raceGraphic, standingsGraphic, drawDuelGraphic } from './result-png';
export function mediaGraphics(data: Entry[], round: number) {
  const q = qualifyingFor(data, round), duel = publishedDuel(data, round);
  const race = raceEntries(data).find(e => roundNumber(e.title) === round);
  const through = data.filter(e => roundNumber(e.title) <= round);
  const races = raceEntries(through);
  return [
    { id: 'qualifying', label: 'Qualifying', available: !!q && classification(q).length > 0, draw: (c: HTMLCanvasElement) => drawResultGraphic(c, qualifyingGraphic(round, classification(q))) },
    { id: 'duel', label: 'Duel', available: !!duel, draw: (c: HTMLCanvasElement) => drawDuelGraphic(c, round, duelSeeds(data, round), duel) },
    { id: 'race', label: 'Race Result', available: !!race && classification(race).length > 0, draw: (c: HTMLCanvasElement) => drawResultGraphic(c, raceGraphic(round, classification(race))) },
    ...[false, true].map(teams => ({ id: teams ? 'wcc' : 'wdc', label: teams ? 'Teams Championship' : 'Drivers Championship', available: races.length > 0, draw: (c: HTMLCanvasElement) => drawResultGraphic(c, standingsGraphic(calculateStandings(through, teams), teams, races.length)) })),
  ];
}
