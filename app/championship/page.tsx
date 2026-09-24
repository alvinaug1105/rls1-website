import type { Metadata } from 'next';
import { LeagueApp } from '../league-app';
export const metadata: Metadata = {
  title: 'Championship standings — RLS1 eSports',
  description: 'Drivers and teams championship standings, gaps and season progression.',
  alternates: { canonical: '/championship' },
  openGraph: { title: 'Championship standings — RLS1 eSports', description: 'Drivers and teams championship standings, gaps and season progression.', url: '/championship' },
};
export default function Page() {
  return <LeagueApp initialView="standings" />;
}
