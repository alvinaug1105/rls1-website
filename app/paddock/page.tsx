import type { Metadata } from 'next';
import { LeagueApp } from '../league-app';
export const metadata: Metadata = {
  title: 'Driver paddock — RLS1 eSports',
  description: 'Race stories and lessons from drivers on the RLS1 grid.',
  alternates: { canonical: '/paddock' },
  openGraph: { title: 'Driver paddock — RLS1 eSports', description: 'Race stories and lessons from drivers on the RLS1 grid.', url: '/paddock' },
};
export default function Page() {
  return <LeagueApp initialView="paddock" />;
}
