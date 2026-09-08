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
assert.equal(
  racing.eventStatus(season.schedule[5], season.archive),
  'QUALIFYING',
);
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
