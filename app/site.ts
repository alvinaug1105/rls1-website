import { SEASON, schedule } from './season';
// Public origin used for canonical URLs, Open Graph and the sitemap.
export const SITE_URL = 'https://rls-website.alvin1105alvin.workers.dev';
export const SITE_NAME = 'RLS1 eSports';
export const SITE_DESCRIPTION = `The ${SEASON.label} home of RLS1: race-week schedule, Qualifying, the top-eight Duel, race results and the championship fight.`;

// Public sections. Each has a real, shareable URL; the league app switches
// between them client-side and keeps the address bar in sync.
export const views = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'results', label: 'Results', path: '/results' },
  { id: 'standings', label: 'Championship', path: '/championship' },
  { id: 'calendar', label: 'Calendar', path: '/calendar' },
  { id: 'drivers', label: 'Drivers', path: '/drivers' },
  { id: 'control', label: 'Noticeboard', path: '/noticeboard' },
  { id: 'videos', label: 'Videos', path: '/videos' },
  { id: 'paddock', label: 'Paddock', path: '/paddock' },
] as const;
export type ViewId = (typeof views)[number]['id'];

export const roundPath = (round: number) => `/rounds/${round}`;
export const validRound = (value: unknown) => {
  const round = Number(value);
  return Number.isInteger(round) && round >= 1 && round <= schedule.length
    ? round
    : null;
};
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const roundLabel = (round: number) =>
  `Round ${pad2(round)} — ${schedule[round - 1]?.country ?? ''}`;
