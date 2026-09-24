import type { Metadata } from 'next';
import { LeagueApp } from '../league-app';
export const metadata: Metadata = {
  title: 'Round results — RLS1 eSports',
  description: 'Qualifying, Duel and race results for the current RLS1 round.',
  alternates: { canonical: '/results' },
  openGraph: { title: 'Round results — RLS1 eSports', description: 'Qualifying, Duel and race results for the current RLS1 round.', url: '/results' },
};
export default function Page() {
  return <LeagueApp initialView="results" />;
}
