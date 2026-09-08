// Supplied league announcements and Season 1 calendar. Missing qualifying rows are not inferred.
export const canonical = (name: string) =>
  ({
    winter_my_wife: 'Winter',
    allenrambeni: 'AllenRambeni',
    'allen rambeni': 'AllenRambeni',
    allenzw: 'AllenRambeni',
    shawn: 'Atlegang',
    atlegang: 'Atlegang',
  })[name.trim().toLowerCase()] || name.trim();
export const schedule = [
  ['Australia', '2026-07-30', '🇦🇺'],
  ['China', '2026-08-05', '🇨🇳'],
  ['Japan', '2026-08-12', '🇯🇵'],
  ['Bahrain', '2026-08-19', '🇧🇭'],
  ['Miami', '2026-08-26', '🇺🇸'],
  ['Monaco', '2026-09-02', '🇲🇨'],
  ['Spain', '2026-09-09', '🇪🇸'],
  ['Austria', '2026-09-16', '🇦🇹'],
  ['Great Britain', '2026-09-23', '🇬🇧'],
  ['Hungary', '2026-09-30', '🇭🇺'],
  ['Belgium', '2026-10-07', '🇧🇪'],
  ['Netherlands', '2026-10-14', '🇳🇱'],
  ['Azerbaijan', '2026-10-21', '🇦🇿'],
  ['Singapore', '2026-10-28', '🇸🇬'],
  ['Las Vegas', '2026-11-04', '🇺🇸'],
  ['Brazil', '2026-11-11', '🇧🇷'],
  ['Qatar', '2026-11-18', '🇶🇦'],
  ['Abu Dhabi', '2026-11-25', '🇦🇪'],
  ['Canada', '2026-12-02', '🇨🇦'],
  ['Saudi Arabia', '2026-12-02', '🇸🇦'],
  ['Italy', '2026-12-02', '🇮🇹'],
  ['France', '2026-12-02', '🇫🇷'],
  ['Germany', '2026-12-02', '🇩🇪'],
  ['Yas Marina', '2026-12-06', '🇦🇪'],
].map(([country, _date, flag], i) => ({
  round: i + 1,
  country,
  date: new Date(Date.UTC(2026, 6, 29 + i * 7)).toISOString().slice(0, 10),
  flag,
  uncertain: false,
}));
export const finishers = [
  ['Winter', 'Atlegang', 'That.Mandem', 'Michell', 'lionell', 'HENRY', 'Eric'],
  ['Winter', 'AllenRambeni'],
  ['Winter', 'AllenRambeni', 'lionell', 'That.Mandem', 'Michell'],
  ['Atlegang', 'Winter', 'AllenRambeni', 'lionell'],
  ['Winter', 'AllenRambeni', 'That.Mandem', 'Atlegang', 'lionell'],
];
export const fastest = [
  ['Winter', '1:04.755'],
  ['Winter', '1:15.922'],
  ['Winter', '1:14.786'],
  ['AllenRambeni', '1:12.794'],
  ['Winter', '1:09.839'],
];
export const qual = [
  { count: 7, pole: '1:03.903', top: ['Winter', 'Atlegang', 'That.Mandem'] },
  { count: 2, pole: '1:16.037', top: ['Winter', 'AllenRambeni'] },
  {
    count: 5,
    pole: '1:14.317',
    top: ['Winter', 'AllenRambeni', 'That.Mandem'],
  },
  { count: 4, pole: '1:10.550', top: ['Winter', 'AllenRambeni', 'Atlegang'] },
  { count: 5, pole: '1:09.464', top: ['Winter', 'AllenRambeni', 'Atlegang'] },
  { count: 3, pole: '0:52.751', top: ['Winter', 'AllenRambeni', 'Atlegang'] },
];
export const roster = [
  { driver: 'lionell', team: 'Ferrari' },
  { driver: 'That.Mandem', team: 'Ferrari' },
  { driver: 'HENRY', team: 'Oracle Red Bull Racing' },
  { driver: 'Eric', team: 'Oracle Red Bull Racing' },
  { driver: 'Shawn', team: 'Mercedes AMG' },
  { driver: 'Indoitalian', team: 'Lamborghini' },
  { driver: 'Winter', team: 'WINter Racing' },
  { driver: 'Michell', team: 'Mercedes AMG' },
  { driver: 'Allen Rambeni', team: 'WINter Racing' },
];
export const teamFor = (driver: string, round: number) =>
  (canonical(driver) === 'Atlegang' && round === 1) ||
  (canonical(driver) === 'Michell' && round <= 5)
    ? 'Noir Étoile Racing'
    : roster.find(
        (r) =>
          canonical(r.driver).toLowerCase() === canonical(driver).toLowerCase(),
      )?.team || '';
export const roundTitle = (r: number) =>
  `Season 1 — Round ${r}: ${schedule[r - 1].country}`;
const raceArchive = finishers.map((names, i) => ({
  id: `archive-r${i + 1}`,
  kind: 'race',
  title: roundTitle(i + 1),
  body: JSON.stringify(
    names.map((driver, p) => ({
      driver,
      team: teamFor(driver, i + 1),
      points:
        [25, 18, 15, 12, 10, 8, 6][p] + (driver === fastest[i][0] ? 1 : 0),
      ...(driver === fastest[i][0]
        ? {
            duelMs: Math.round(
              (Number(fastest[i][1].split(':')[0]) * 60 +
                Number(fastest[i][1].split(':')[1])) *
                1000,
            ),
          }
        : {}),
    })),
  ),
  author: 'Race Control',
  userId: 'archive',
  approved: 1,
  created: `${['2026-08-03', '2026-08-08', '2026-08-17', '2026-08-22', '2026-09-01'][i]}T00:00:00Z`,
}));
export const roundNumber = (title: string) =>
  Number(title.match(/Round\s+(\d+)/i)?.[1] || 0);
// Full qualifying transcribed from the six supplied classification screenshots.
const qualRows: [string, number, string][][] = [
  [
    ['Winter', 1, '1:03.903'],
    ['Atlegang', 2, '1:06.808'],
    ['That.Mandem', 1, '1:10.734'],
    ['Michell', 1, '1:11.877'],
    ['lionell', 1, '1:18.022'],
    ['Eric', 1, '1:21.525'],
    ['HENRY', 1, '1:21.526'],
  ],
  [
    ['Winter', 1, '1:16.037'],
    ['Allen Rambeni', 1, '1:17.062'],
  ],
  [
    ['Winter', 1, '1:14.317'],
    ['Allen Rambeni', 3, '1:14.794'],
    ['That.Mandem', 2, '1:21.980'],
    ['Michell', 1, '1:22.265'],
    ['lionell', 1, '1:22.717'],
  ],
  [
    ['Winter', 1, '1:10.550'],
    ['Allen Rambeni', 1, '1:12.679'],
    ['Shawn', 1, '1:13.466'],
    ['lionell', 1, '1:19.808'],
  ],
  [
    ['Winter', 3, '1:09.464'],
    ['Allen Rambeni', 2, '1:11.974'],
    ['Shawn', 1, '1:12.811'],
    ['That.Mandem', 1, '1:16.801'],
    ['lionell', 1, '1:24.850'],
  ],
  [
    ['Winter', 3, '0:52.751'],
    ['Shawn', 1, '0:58.849'],
    ['Allen Rambeni', 1, '0:58.923'],
  ],
];
export const qualifyingArchive = qualRows.map((rows, i) => ({
  id: `archive-q${i + 1}`,
  kind: 'qualifying',
  title: roundTitle(i + 1),
  body: JSON.stringify(
    rows.map(([driver, attempts, time]) => ({
      driver,
      team: teamFor(driver, i + 1),
      attempts,
      ms: Math.round(
        (Number(time.split(':')[0]) * 60 + Number(time.split(':')[1])) * 1000,
      ),
    })),
  ),
  author: 'Race Control',
  userId: 'archive',
  approved: 1,
  created: schedule[i].date + 'T00:00:00Z',
}));
export const archive = [...raceArchive, ...qualifyingArchive];
export function mergeArchive<T extends { kind: string; title: string }>(
  data: T[],
) {
  return [
    ...archive.filter(
      (a) =>
        !data.some(
          (d) =>
            d.kind === a.kind &&
            (d.title === a.title ||
              roundNumber(d.title) === roundNumber(a.title)),
        ),
    ),
    ...data,
  ];
}
