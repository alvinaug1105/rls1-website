import type { Metadata } from 'next';
import { LeagueApp } from '../league-app';
export const metadata: Metadata = {
  title: 'Driver profiles — RLS1 eSports',
  description: 'RLS1 driver statistics: points, wins, podiums, poles, Duel wins and recent form.',
  alternates: { canonical: '/drivers' },
  openGraph: { title: 'Driver profiles — RLS1 eSports', description: 'RLS1 driver statistics: points, wins, podiums, poles, Duel wins and recent form.', url: '/drivers' },
};
export default function Page() {
  return <LeagueApp initialView="drivers" />;
}
