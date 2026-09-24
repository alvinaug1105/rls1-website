import type { Metadata } from 'next';
import { LeagueApp } from '../league-app';
export const metadata: Metadata = {
  title: 'Track videos — RLS1 eSports',
  description: 'Community onboard laps, circuit guides and race highlights.',
  alternates: { canonical: '/videos' },
  openGraph: { title: 'Track videos — RLS1 eSports', description: 'Community onboard laps, circuit guides and race highlights.', url: '/videos' },
};
export default function Page() {
  return <LeagueApp initialView="videos" />;
}
