'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SessionCountdown } from './session-countdown';
import { StatusBadge } from './status-badge';
import { StageTimeline } from './stage-timeline';
import { DuelView } from './duel-ui';
import { QualifyingCard } from './qualifying-card';
import { RaceClassification } from './race-card';
import { formatLap } from './result-utils';
import { roundNumber, schedule, SEASON } from './season';
import {
  calendarFile,
  downloadFile,
  events,
  eventStatus,
  getCurrentLeagueRound,
} from './racing';
import { dayLabel, raceWeekLabel, raceWeekStages, roundSummary } from './race-week';
import { announcedStart } from './session';
import { EmptyState } from './race-ui';
import { BrowserLink as Link, clientNav } from './browser-link';
import { pad2, roundPath } from './site';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Entry } from './league';

const tabs = ['overview', 'qualifying', 'duel', 'race', 'stewarding'] as const;
type Tab = (typeof tabs)[number];
const isTab = (v: string): v is Tab => (tabs as readonly string[]).includes(v);

export function RoundView({
  data,
  round,
  now,
  onRound,
}: {
  data: Entry[];
  round: number | null;
  now: number | null;
  onRound: (round: number, tab?: string) => void;
}) {
  if (!round)
    return (
      <section className="panel race-banner" aria-busy="true">
        <p className="eyebrow">CURRENT ROUND</p>
        <p className="skeleton-line wide" />
        <span className="sr-only">Loading the current round…</span>
      </section>
    );
  return <RoundHub key={round} data={data} round={round} now={now} onRound={onRound} />;
}

function RoundHub({
  data,
  round,
  now,
  onRound,
}: {
  data: Entry[];
  round: number;
  now: number | null;
  onRound: (round: number, tab?: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  useEffect(() => {
    const apply = () => {
      const hash = location.hash.slice(1);
      setTab(hash === 'penalties' ? 'stewarding' : isTab(hash) ? hash : 'overview');
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);
  const select = (next: Tab) => {
    setTab(next);
    history.replaceState(null, '', roundPath(round) + (next === 'overview' ? '' : `#${next}`));
  };
  const event = events(data)[round - 1];
  const summary = useMemo(() => roundSummary(data, round), [data, round]);
  const decisions = useMemo(
    () =>
      data.filter(
        (e) =>
          e.approved === 1 &&
          e.kind === 'penalty' &&
          roundNumber(e.title) === round,
      ),
    [data, round],
  );
  const status = eventStatus(event, data, now ?? undefined);
  const isCurrent = now !== null && getCurrentLeagueRound(data, now)?.round === round;
  const announced = now !== null ? announcedStart(event, now) : null;
  const neighbour = (r: number) =>
    r >= 1 && r <= schedule.length ? (
      <Link
        className="outline icon-button"
        href={roundPath(r)}
        onClick={(e) => clientNav(e, () => onRound(r))}
        aria-label={`${r < round ? 'Previous' : 'Next'} round: Round ${pad2(r)}, ${schedule[r - 1].country}`}
      >
        {r < round ? <ChevronLeft size={18} aria-hidden="true" /> : null}
        R{pad2(r)}
        {r > round ? <ChevronRight size={18} aria-hidden="true" /> : null}
      </Link>
    ) : (
      <span />
    );
  const facts: [string, string, string | undefined, Tab][] = [
    ['Pole position', summary.pole?.driver ?? '—', summary.pole?.team, 'qualifying'],
    [
      'Duel winner',
      summary.duelWinner?.driver ?? (summary.duelStale ? 'Under review' : '—'),
      summary.duelWinner?.team,
      'duel',
    ],
    ['Race winner', summary.raceWinner?.driver ?? '—', summary.raceWinner?.team, 'race'],
    [
      'Fastest Duel lap',
      summary.fastestLap ? formatLap(summary.fastestLap.ms) : '—',
      summary.fastestLap?.driver,
      summary.fastestLap?.source === 'duel' ? 'duel' : 'race',
    ],
  ];
  return (
    <>
      <section className="race-banner" aria-labelledby="round-title">
        <div className="race-banner-main">
          <p className="eyebrow">
            ROUND {pad2(round)} / {schedule.length} ·{' '}
            {isCurrent ? 'CURRENT RACE WEEK' : SEASON.label.toUpperCase()}
          </p>
          <h1 id="round-title" className="round-title">
            <span aria-hidden="true">{event.flag}</span> {event.country}
          </h1>
          <p className="hero-dates">{raceWeekLabel(event)} · Hong Kong time</p>
          <StatusBadge status={status} />
        </div>
        <div className="round-number" data-round={pad2(round)} aria-hidden="true" />
        <nav className="round-nav" aria-label="Rounds">
          {neighbour(round - 1)}
          <label className="sr-only" htmlFor="round-picker">
            Choose round
          </label>
          <select
            id="round-picker"
            value={round}
            onChange={(e) => onRound(Number(e.target.value))}
          >
            {schedule.map((r) => (
              <option value={r.round} key={r.round}>
                R{pad2(r.round)} · {r.country}
              </option>
            ))}
          </select>
          {neighbour(round + 1)}
        </nav>
      </section>
      <Tabs value={tab} onValueChange={(v) => select(String(v) as Tab)}>
        <TabsList className="event-tabs" aria-label="Round sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="qualifying">Qualifying</TabsTrigger>
          <TabsTrigger value="duel">Duel</TabsTrigger>
          <TabsTrigger value="race">Race</TabsTrigger>
          <TabsTrigger value="stewarding">
            Stewarding{decisions.length ? ` (${decisions.length})` : ''}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="overview-grid">
            <section className="panel" aria-labelledby="week-title">
              <p className="eyebrow">RACE WEEK</p>
              <h2 id="week-title" className="section-title">
                {status === 'FINISHED' ? 'Round complete' : 'Where the round stands'}
              </h2>
              <StageTimeline stages={raceWeekStages(event, data, now ?? undefined)} />
              {isCurrent && <SessionCountdown event={event} data={data} />}
              <dl className="fact-list">
                <div>
                  <dt>Qualifying opens</dt>
                  <dd>{dayLabel(event.date)} · 21:00 HKT</dd>
                </div>
                <div>
                  <dt>Announced start</dt>
                  <dd>{announced ? announced.label : 'To be announced'}</dd>
                </div>
              </dl>
              {event.notes && <p className="storybody event-notes">{event.notes}</p>}
              <button
                className="outline"
                onClick={() =>
                  downloadFile(`rls1-round-${round}.ics`, calendarFile([event]), 'text/calendar')
                }
              >
                Add to calendar
              </button>
            </section>
            <section className="panel" aria-labelledby="summary-title">
              <p className="eyebrow">ROUND SUMMARY</p>
              <h2 id="summary-title" className="section-title">
                Official results
              </h2>
              <ul className="summary-list">
                {facts.map(([label, value, detail, target]) => (
                  <li key={label}>
                    <span className="summary-label">{label}</span>
                    <strong className={value === '—' ? 'is-empty' : undefined}>{value}</strong>
                    {detail && <small className="team">{detail}</small>}
                    {value !== '—' && (
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => select(target)}
                      >
                        View {target}
                        <span className="sr-only"> for Round {round}</span>
                      </button>
                    )}
                  </li>
                ))}
                <li>
                  <span className="summary-label">Steward decisions</span>
                  <strong>{decisions.length}</strong>
                  {decisions.length > 0 && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => select('stewarding')}
                    >
                      View decisions
                    </button>
                  )}
                </li>
              </ul>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="qualifying">
          <QualifyingCard rows={summary.qualifying} />
        </TabsContent>
        <TabsContent value="duel">
          <DuelView data={data} round={round} />
        </TabsContent>
        <TabsContent value="race">
          <RaceClassification rows={summary.race} fastest={summary.fastestLap} />
        </TabsContent>
        <TabsContent value="stewarding">
          <section className="panel" aria-labelledby="stewarding-title">
            <h2 id="stewarding-title" className="section-title">
              Steward decisions
            </h2>
            {!decisions.length ? (
              <EmptyState title="No published steward decisions">
                Any penalties or official notes for this round will appear here.
              </EmptyState>
            ) : (
              decisions.map((p) => {
                let note: Record<string, string>;
                try {
                  note = JSON.parse(p.body);
                } catch {
                  return null;
                }
                return (
                  <article className="notice" data-category="STEWARDING" key={p.id}>
                    <p className="notice-meta">
                      <span className="category-chip" data-category="STEWARDING">
                        {note.type}
                      </span>
                    </p>
                    <h3>{note.driver}</h3>
                    <p className="decision">{note.penalty}</p>
                    <p className="storybody">{note.reason}</p>
                    {note.note && <p className="muted">{note.note}</p>}
                  </article>
                );
              })
            )}
            <p className="footnote">
              Decisions are recorded here. Only the published race classification
              determines championship points.
            </p>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
