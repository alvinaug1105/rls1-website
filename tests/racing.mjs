/* eslint-disable typescript/no-implied-eval -- Transpile and execute only checked-in local test modules without adding a runtime dependency. */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();
function load(file) {
  const full = path.resolve(root, file);
  if (cache.has(full)) return cache.get(full);
  const exports = {};
  cache.set(full, exports);
  const source = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function('exports', 'require', source)(exports, (p) =>
    load(path.relative(root, path.resolve(path.dirname(full), p + '.ts'))),
  );
  return exports;
}
const season = load('app/season.ts'),
  racing = load('app/racing.ts'),
  utils = load('app/result-utils.ts'),
  validation = load('app/validation.ts');
assert.deepEqual(
  season.archive,
  JSON.parse(
    fs.readFileSync(
      path.join(root, 'tests/fixtures/season-archive.json'),
      'utf8',
    ),
  ),
  'Real season data must be unchanged',
);
const standings = racing.calculateStandings(season.archive),
  teams = racing.calculateStandings(season.archive, true);
assert.deepEqual(
  standings.map((d) => d.points),
  [122, 70, 55, 47, 42, 22, 8, 6],
);
assert.deepEqual(
  teams.map((d) => d.points),
  [192, 89, 40, 37, 14],
);
assert.equal(standings[0].wins, 4);
assert.equal(standings[0].podiums, 5);
assert.equal(standings[0].gap, 0);
assert.equal(standings[1].gap, 52);
assert.equal(
  racing.progression(season.archive).at(-1).standings[0].points,
  122,
);
assert.equal(
  racing.nextEvent(season.archive, Date.parse('2026-09-08T12:00:00Z')).round,
  7,
);
assert.equal(
  racing.nextEvent(season.archive, Date.parse('2027-02-01T12:00:00Z')),
  undefined,
);
assert.equal(racing.eventStatus(season.schedule[5], season.archive), 'DUEL');
assert.equal(
  racing.eventStatus(season.schedule[0], season.archive),
  'FINISHED',
);
const ics = racing.calendarFile([season.schedule[6]], 0);
assert.match(ics, /DTSTART;VALUE=DATE:20260909/);
assert.match(ics, /DTEND;VALUE=DATE:20260910/);
assert.match(
  racing.calendarFile(
    [{ ...season.schedule[6], startAt: '2026-09-09T12:00:00.000Z' }],
    0,
  ),
  /DTSTART:20260909T120000Z/,
);
assert.equal(utils.parseLap('52:751'), 52751);
assert.equal(utils.parseLap('1:03:903'), 63903);
assert.throws(() => utils.parseLap('1:60.000'));
assert.throws(() => utils.parseLap('999999999999999999999:00.000'));
const row = { driver: 'Driver', team: 'Team', points: 1 };
assert.throws(() => validation.validateClassification('race', [row, row]));
assert.throws(() =>
  validation.validateClassification('race', [{ ...row, position: 2 }]),
);
assert.throws(() =>
  validation.validateClassification('race', [{ ...row, points: -1 }]),
);
assert.throws(() =>
  validation.validateOfficial(
    'event',
    'Round 7',
    JSON.stringify({ date: '2026-02-30', notes: '', status: 'UPCOMING' }),
  ),
);
validation.validateOfficial(
  'event',
  'Round 7',
  JSON.stringify({
    date: '2026-09-09',
    startAt: '2026-09-09T12:00:00.000Z',
    notes: '',
    status: 'UPCOMING',
  }),
);
const q = season.qualifyingArchive[5];
assert.match(racing.qualifyingRecap(6, JSON.parse(q.body)), /0:52.751/);
assert.match(
  racing.raceRecap(
    5,
    racing.classification(
      season.archive.find(
        (e) => e.kind === 'race' && season.roundNumber(e.title) === 5,
      ),
    ),
  ),
  /Fastest duel lap: Winter/,
);
assert.deepEqual(
  racing.calculateStandings([
    ...season.archive,
    {
      id: 'test',
      approved: 1,
      kind: 'penalty',
      title: 'Round 1',
      body: '{}',
      created: '',
      author: '',
    },
  ]),
  standings,
  'Steward notes cannot silently change points',
);
console.log(
  'PASS: archive preservation, WDC/WCC, wins/podiums/gaps, progression, event selection/status, ICS dates/timezones, lap validation, duplicate/position validation, recaps and penalty isolation.',
);

// Race-day behavior always uses the schedule date in Hong Kong, independent
// of visitor timezone and even after the confirmed start has passed.
const todayEvent = season.schedule[6];
const followingEvent = season.schedule[7];
const instant = (date, time) => Date.parse(`${date}T${time}+08:00`);
const eventOverride = {
  id: 'test-event-clock',
  kind: 'event',
  approved: 1,
  title: season.roundTitle(todayEvent.round),
  author: 'Test',
  created: '',
  body: JSON.stringify({
    date: todayEvent.date,
    startAt: `${todayEvent.date}T18:00:00+08:00`,
    status: 'UPCOMING',
  }),
};
const clockData = [...season.archive, eventOverride];
const scheduled = racing
  .events(clockData)
  .find((e) => e.round === todayEvent.round);
for (const time of ['00:00:00', '20:59:59', '21:00:00', '23:59:59']) {
  assert.equal(
    racing.nextEvent(clockData, instant(todayEvent.date, time)).round,
    todayEvent.round,
  );
}
assert.equal(
  racing.eventStatus(
    scheduled,
    clockData,
    instant(todayEvent.date, '20:59:59'),
  ),
  'RACE WEEK',
);
assert.equal(
  racing.eventStatus(
    scheduled,
    clockData,
    instant(todayEvent.date, '21:00:00'),
  ),
  'QUALIFYING',
);
assert.equal(
  racing.eventStatus(
    scheduled,
    clockData,
    instant(todayEvent.date, '23:59:59'),
  ),
  'QUALIFYING',
);
const midnightAfter = instant(todayEvent.date, '00:00:00') + 5 * 86400000;
assert.equal(
  racing.nextEvent(clockData, midnightAfter).round,
  followingEvent.round,
);
assert.equal(
  racing.raceDayClock(instant(todayEvent.date, '00:00:00')).date,
  todayEvent.date,
);
const finishedData = [
  ...clockData,
  { ...eventOverride, id: 'test-race-completed', kind: 'race', body: '[]' },
];
assert.equal(
  racing.nextEvent(finishedData, instant(todayEvent.date, '22:00:00')).round,
  todayEvent.round,
);
assert.equal(
  racing.eventStatus(
    scheduled,
    finishedData,
    instant(todayEvent.date, '22:00:00'),
  ),
  'FINISHED',
);
assert.equal(
  racing.eventStatus(
    { ...scheduled, status: 'LIVE' },
    clockData,
    instant(todayEvent.date, '22:00:00'),
  ),
  'LIVE',
);
const futureLive = {
  ...eventOverride,
  id: 'test-future-live',
  title: season.roundTitle(followingEvent.round),
  body: JSON.stringify({ date: followingEvent.date, status: 'LIVE' }),
};
assert.equal(
  racing.nextEvent(
    [...clockData, futureLive],
    instant(todayEvent.date, '22:00:00'),
  ).round,
  todayEvent.round,
);
const rescheduled = {
  ...eventOverride,
  body: JSON.stringify({ date: followingEvent.date, status: 'UPCOMING' }),
};
assert.notEqual(
  racing.nextEvent(
    [...season.archive, rescheduled],
    instant(todayEvent.date, '22:00:00'),
  ).date,
  todayEvent.date,
);
console.log(
  'PASS: Hong Kong race-day priority, elapsed start time, 21:00 qualifying boundary, midnight rollover, published completion, live precedence and schedule overrides.',
);

const duels = load('app/duel.ts');
const weekStart = instant(todayEvent.date, '00:00:00');
for (let day = 0; day < 5; day++) {
  assert.equal(
    racing.getCurrentLeagueRound(
      clockData,
      weekStart + day * 86400000 + 12 * 3600000,
    ).round,
    todayEvent.round,
  );
  assert.equal(
    racing.getCurrentLeagueRound(
      finishedData,
      weekStart + day * 86400000 + 12 * 3600000,
    ).round,
    todayEvent.round,
  );
}
assert.equal(
  racing.getCurrentLeagueRound(clockData, weekStart + 5 * 86400000 - 1).round,
  todayEvent.round,
);
for (const day of [5, 6])
  assert.equal(
    racing.getCurrentLeagueRound(clockData, weekStart + day * 86400000).round,
    followingEvent.round,
  );
const qualifiers = Array.from({ length: 10 }, (_, i) => ({
  driver: `Qualifier ${i + 1}`,
  team: 'Test team',
  ms: 60000 + i * 1000,
  attempts: 1,
}));
const duelQual = {
  ...eventOverride,
  id: 'test-qual',
  kind: 'qualifying',
  body: JSON.stringify(qualifiers),
};
const withQ = [...clockData, duelQual];
const seeds = duels.duelSeeds(withQ, todayEvent.round);
assert.equal(seeds.length, 8);
assert.deepEqual(
  duels
    .duelBracket(seeds)
    .slice(0, 4)
    .map((m) => m.players.map((p) => p.driver)),
  [
    ['Qualifier 1', 'Qualifier 8'],
    ['Qualifier 4', 'Qualifier 5'],
    ['Qualifier 2', 'Qualifier 7'],
    ['Qualifier 3', 'Qualifier 6'],
  ],
);
let record = {
  round: todayEvent.round,
  qualifyingBody: duelQual.body,
  winners: {
    QF1: 'Qualifier 1',
    QF2: 'Qualifier 4',
    QF3: 'Qualifier 2',
    QF4: 'Qualifier 3',
  },
  laps: { 'Qualifier 1': 61500 },
};
assert.deepEqual(
  duels.duelBracket(seeds, record.winners)[4].players.map((p) => p.driver),
  ['Qualifier 1', 'Qualifier 4'],
);
record = {
  ...record,
  winners: {
    ...record.winners,
    SF1: 'Qualifier 1',
    SF2: 'Qualifier 2',
    FINAL: 'Qualifier 2',
  },
};
assert.equal(
  duels.duelBracket(seeds, record.winners)[6].winner.driver,
  'Qualifier 2',
);
assert.doesNotThrow(() => duels.validateDuel(record, withQ, todayEvent.round));
for (const winners of [
  { QF1: 'Qualifier 2' },
  { SF1: 'Qualifier 1' },
  { ...record.winners, FINAL: 'Qualifier 3' },
])
  assert.throws(() =>
    duels.validateDuel({ ...record, winners }, withQ, todayEvent.round),
  );
for (const ms of [-1, 0, 1.5, '1:00.000'])
  assert.throws(() =>
    duels.validateDuel(
      { ...record, laps: { 'Qualifier 1': ms } },
      withQ,
      todayEvent.round,
    ),
  );
assert.throws(() => duels.validateDuel(record, clockData, todayEvent.round));
assert.throws(() =>
  duels.validateDuel(
    record,
    [...clockData, { ...duelQual, approved: 0 }],
    todayEvent.round,
  ),
);
assert.throws(() =>
  duels.validateDuel({ ...record, round: '7' }, withQ, todayEvent.round),
);
assert.throws(() => duels.validateDuel(record, withQ, 25));
assert.throws(() =>
  duels.validateDuel(
    { ...record, qualifyingBody: 'changed' },
    withQ,
    todayEvent.round,
  ),
);
assert.equal(
  duels.duelSeeds(
    [
      ...clockData,
      { ...duelQual, body: JSON.stringify([qualifiers[0], qualifiers[0]]) },
    ],
    todayEvent.round,
  ).length,
  0,
);
assert.equal(
  duels.duelSeeds(
    [...clockData, { ...duelQual, body: '[{"driver":"Missing time"}]' }],
    todayEvent.round,
  ).length,
  0,
);
for (const size of [2, 3, 4, 5, 6, 7]) {
  const smallData = [
    ...clockData,
    { ...duelQual, body: JSON.stringify(qualifiers.slice(0, size)) },
  ];
  const smallSeeds = duels.duelSeeds(smallData, todayEvent.round);
  const winners = {};
  for (const id of duels.matchIds) {
    const m = duels.duelBracket(smallSeeds, winners).find((x) => x.id === id);
    if (m.ready && m.players.length === 2) winners[id] = m.players[0].driver;
  }
  assert.ok(duels.duelBracket(smallSeeds, winners)[6].winner);
  assert.doesNotThrow(() =>
    duels.validateDuel(
      {
        ...record,
        qualifyingBody: JSON.stringify(qualifiers.slice(0, size)),
        winners,
        laps: {},
      },
      smallData,
      todayEvent.round,
    ),
  );
}
assert.equal(duels.duelBracket([qualifiers[0]])[6].winner, undefined);
assert.equal(
  racing.eventStatus(scheduled, withQ, weekStart + 20 * 3600000),
  'DUEL',
);
assert.equal(
  racing.eventStatus(scheduled, withQ, weekStart + 22 * 3600000),
  'DUEL',
);
const withDuel = [
  ...withQ,
  { ...duelQual, kind: 'duel', id: 'duel-test', body: JSON.stringify(record) },
];
assert.equal(
  racing.eventStatus(scheduled, withDuel, weekStart + 22 * 3600000),
  'RACE',
);
assert.equal(
  racing.getCurrentLeagueRound(withDuel, weekStart + 4 * 86400000).round,
  todayEvent.round,
);
assert.deepEqual(
  racing.calculateStandings(withDuel),
  racing.calculateStandings(clockData),
);
console.log(
  'PASS: Wednesday–Sunday race week, Monday/Tuesday rollover, published stage precedence, top-eight bracket, byes, progression, invalid selections/laps, qualifying dependency and points isolation.',
);
