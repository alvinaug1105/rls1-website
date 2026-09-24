import type { Metadata } from 'next';
import { LeagueApp } from '../league-app';
export const metadata: Metadata = {
  title: 'Race control noticeboard — RLS1 eSports',
  description: 'Official RLS1 race control notices and steward decisions.',
  alternates: { canonical: '/noticeboard' },
  openGraph: { title: 'Race control noticeboard — RLS1 eSports', description: 'Official RLS1 race control notices and steward decisions.', url: '/noticeboard' },
};
export default function Page() {
  return <LeagueApp initialView="control" />;
}
