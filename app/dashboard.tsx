'use client';
import { useMemo } from 'react';
import { SessionCountdown } from './session-countdown';
import { StatusBadge } from './status-badge';
import { StageTimeline } from './stage-timeline';
import {
  calculateStandings,
  events,
  eventStatus,
  getCurrentLeagueRound,
  raceEntries,
  raceWeekWindow,
} from './racing';
import { raceWeekLabel, raceWeekStages, roundSummary } from './race-week';
import { formatLap } from './result-utils';
import { roundNumber, SEASON } from './season';
import { latestCommunications } from './noticeboard';
import { pad2, roundPath, type ViewId } from './site';
import type { Entry } from './league';
import { BrowserLink as Link, clientNav as go } from './browser-link';


export function Dashboard({
  data,
  now,
  onRound,
  onView,
}: {
  data: Entry[];
  now: number | null;
  onRound: (round: number, tab?: string) => void;
  onView: (view: ViewId) => void;
}) {
  const standings = useMemo(() => calculateStandings(data), [data]);
  const latestRace = useMemo(() => raceEntries(data).at(-1), [data]);
  const latest = latestRace ? roundSummary(data, roundNumber(latestRace.title)) : undefined;
  const event = now === null ? undefined : getCurrentLeagueRound(data, now);
  const inWeek =
    event && now !== null && now >= raceWeekWindow(event).start && now < raceWeekWindow(event).end;
  const following = event ? events(data).find((e) => e.round === event.round + 1) : undefined;
  const communication = latestCommunications(data)[0];
  return (
    <>
      <div className="intro">
        <h1>RLS1 eSports</h1>
        <p>
          Online racing league · {SEASON.label} · 24 rounds. Every race week runs
          Wednesday to Sunday: Qualifying, a top-eight Duel, then the Race.
        </p>
      </div>
      <div className="home-grid">
        <section className="panel hero-week" aria-labelledby="hero-title">
          {now === null ? (
            <div className="hero-skeleton" aria-busy="true">
              <p className="eyebrow">Race week</p>
              <p className="skeleton-line wide" />
              <p className="skeleton-line" />
              <span className="sr-only">Loading the current race week…</span>
            </div>
          ) : event ? (
            <>
              <p className="eyebrow">{inWeek ? 'CURRENT RACE WEEK' : 'NEXT RACE WEEK'}</p>
              <div className="hero-head">
                <p className="hero-round">
                  ROUND {pad2(event.round)} <span aria-hidden="true">{event.flag}</span>
                </p>
                <StatusBadge status={eventStatus(event, data, now)} />
              </div>
              <h2 id="hero-title" className="hero-country">
                {event.country}
              </h2>
              <p className="hero-dates">{raceWeekLabel(event)} · Hong Kong time</p>
              <StageTimeline stages={raceWeekStages(event, data, now)} />
              <SessionCountdown event={event} data={data} />
              <Link
                className="primary"
                href={roundPath(event.round)}
                onClick={(e) => go(e, () => onRound(event.round))}
              >
                View Round {pad2(event.round)} →
              </Link>
            </>
          ) : (
            <>
              <p className="eyebrow">SEASON STATUS</p>
              <h2 id="hero-title">{SEASON.label} complete</h2>
              <p className="muted">No further rounds are scheduled.</p>
            </>
          )}
        </section>
        <section className="panel title-fight" aria-labelledby="battle-title">
          <p className="eyebrow">CHAMPIONSHIP BATTLE</p>
          <h2 id="battle-title" className="section-title">
            Drivers’ championship
          </h2>
          {standings.length ? (
            <ol className="leader-list">
              {standings.slice(0, 3).map((r) => (
                <li className="leader-row" key={r.name} data-position={r.position}>
                  <span className="position">P{r.position}</span>
                  <span className="leader-name">
                    <strong>{r.name}</strong>
                    <small className="team">{r.team}</small>
                  </span>
                  <span className="leader-points">
                    <strong>{r.points}</strong> <small>pts</small>
                    <small className="leader-gap">
                      {r.gap ? `−${r.gap}` : 'Leader'}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Standings appear after the first race.</p>
          )}
          <Link
            className="outline"
            href="/championship"
            onClick={(e) => go(e, () => onView('standings'))}
          >
            Full standings →
          </Link>
        </section>
      </div>
      <div className="home-cards">
        <section className="panel home-card" aria-labelledby="latest-title">
          <p className="eyebrow">LATEST RESULT</p>
          {latest ? (
            <>
              <h2 id="latest-title" className="card-title">
                Round {pad2(latest.round)} · {latest.country}
              </h2>
              <dl className="fact-list">
                <div>
                  <dt>Winner</dt>
                  <dd>{latest.raceWinner?.driver ?? '—'}</dd>
                </div>
                <div>
                  <dt>Pole</dt>
                  <dd>{latest.pole?.driver ?? '—'}</dd>
                </div>
                <div>
                  <dt>Fastest Duel lap</dt>
                  <dd>
                    {latest.fastestLap
                      ? `${latest.fastestLap.driver} · ${formatLap(latest.fastestLap.ms)}`
                      : '—'}
                  </dd>
                </div>
              </dl>
              <Link
                className="outline"
                href={`${roundPath(latest.round)}#race`}
                onClick={(e) => go(e, () => onRound(latest.round, 'race'))}
              >
                Full classification →
              </Link>
            </>
          ) : (
            <>
              <h2 id="latest-title" className="card-title">No results yet</h2>
              <p className="muted">The first official classification will appear here.</p>
            </>
          )}
        </section>
        <section className="panel home-card" aria-labelledby="next-title">
          <p className="eyebrow">{inWeek ? 'NEXT ROUND' : 'FOLLOWING ROUND'}</p>
          {following ? (
            <>
              <h2 id="next-title" className="card-title">
                Round {pad2(following.round)} · {following.country}
              </h2>
              <p className="muted">{raceWeekLabel(following)}</p>
              <Link
                className="outline"
                href={roundPath(following.round)}
                onClick={(e) => go(e, () => onRound(following.round))}
              >
                Round preview →
              </Link>
            </>
          ) : (
            <>
              <h2 id="next-title" className="card-title">Calendar</h2>
              <p className="muted">
                {now === null ? 'Loading schedule…' : 'No later round is scheduled.'}
              </p>
            </>
          )}
          <Link
            className="text-link"
            href="/calendar"
            onClick={(e) => go(e, () => onView('calendar'))}
          >
            Season calendar
          </Link>
        </section>
        <section className="panel home-card" aria-labelledby="notice-title">
          <p className="eyebrow">RACE CONTROL</p>
          {communication ? (
            <>
              <h2 id="notice-title" className="card-title">
                {communication.title}
              </h2>
              <p className="notice-meta">
                <span className="category-chip" data-category={communication.category}>
                  {communication.category}
                </span>{' '}
                {communication.when}
              </p>
              <p className="clamp-3">{communication.summary}</p>
            </>
          ) : (
            <>
              <h2 id="notice-title" className="card-title">No notices</h2>
              <p className="muted">Official notices and steward decisions appear here.</p>
            </>
          )}
          <Link
            className="outline"
            href="/noticeboard"
            onClick={(e) => go(e, () => onView('control'))}
          >
            Noticeboard →
          </Link>
        </section>
      </div>
    </>
  );
}
