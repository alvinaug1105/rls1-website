import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LeagueApp } from '../../league-app';
import { roundLabel, roundPath, validRound } from '../../site';
type Props = { params: Promise<{ round: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const round = validRound((await params).round);
  if (!round) return { title: 'Round not found — RLS1 eSports' };
  const title = `RLS1 ${roundLabel(round)} | Qualifying, Duel & Race`;
  const description = `${roundLabel(round)}: qualifying classification, Duel bracket, official race result and steward decisions.`;
  return {
    title,
    description,
    alternates: { canonical: roundPath(round) },
    openGraph: { title, description, url: roundPath(round) },
    twitter: { title, description },
  };
}
export default async function RoundPage({ params }: Props) {
  const round = validRound((await params).round);
  if (!round) notFound();
  return <LeagueApp initialView="results" initialRound={round} />;
}
