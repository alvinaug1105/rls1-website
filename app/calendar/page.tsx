import type { Metadata } from 'next';
import { LeagueApp } from '../league-app';
export const metadata: Metadata = {
  title: 'Season calendar — RLS1 eSports',
  description: 'All 24 RLS1 rounds with race-week dates in Hong Kong time, plus calendar downloads.',
  alternates: { canonical: '/calendar' },
  openGraph: { title: 'Season calendar — RLS1 eSports', description: 'All 24 RLS1 rounds with race-week dates in Hong Kong time, plus calendar downloads.', url: '/calendar' },
};
export default function Page() {
  return <LeagueApp initialView="calendar" />;
}
