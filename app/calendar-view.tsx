'use client';
import { useMemo, useState } from 'react';
import {
  calendarFile,
  downloadFile,
  events,
  eventStatus,
  getCurrentLeagueRound,
  raceWeekWindow,
} from './racing';
import { raceWeekLabel, roundSummary } from './race-week';
import { announcedStart } from './session';
import { SEASON } from './season';
import { BrowserLink as Link, clientNav } from './browser-link';
import { pad2, roundPath } from './site';
import type { Entry } from './league';

type CardState = 'completed' | 'current' | 'upcoming' | 'unreported';
const stateLabel: Record<CardState, string> = {
  completed: 'Completed',
  current: 'Current race week',
  upcoming: 'Upcoming',
  unreported: 'No result published',
};

export function CalendarView({
  data,
  now,
  onRound,
}: {
  data: Entry[];
  now: number | null;
  onRound: (round: number, tab?: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'remaining' | 'completed'>('all');
  const all = useMemo(() => events(data), [data]);
  const current = now === null ? undefined : getCurrentLeagueRound(data, now);
  const cards = all.map((e) => {
    const finished = eventStatus(e, data, now ?? undefined) === 'FINISHED';
    const state: CardState =
      e.round === current?.round
        ? 'current'
        : finished
          ? 'completed'
          : now !== null && raceWeekWindow(e).end <= now
            ? 'unreported'
            : 'upcoming';
    return { e, state, finished };
  });
  const visible = cards.filter(
    (c) =>
      filter === 'all' ||
      (filter === 'completed' ? c.finished : !c.finished),
  );
  const done = cards.filter((c) => c.finished).length;
  return (
    <>
      <div className="sectionhead viewheading">
        <div>
          <p className="eyebrow">{all.length} ROUNDS. ONE CHAMPIONSHIP.</p>
          <h1 className="page-title">{SEASON.label} calendar</h1>
          <p className="muted">
            {done} of {all.length} rounds completed. Race weeks run Wednesday to
            Sunday in Hong Kong time; Qualifying opens Wednesday 21:00 HKT.
          </p>
        </div>
        <button
          className="outline"
          onClick={() => downloadFile('rls1-season-1.ics', calendarFile(all), 'text/calendar')}
        >
          Add season to calendar
        </button>
      </div>
      <fieldset className="segmented">
              <legend className="sr-only">Filter rounds</legend>
        {(
          [
            ['all', 'All rounds'],
            ['remaining', 'Remaining'],
            ['completed', 'Completed'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </fieldset>
      <ol className="calendargrid">
        {visible.map(({ e, state, finished }) => {
          const winner = finished ? roundSummary(data, e.round).raceWinner : undefined;
          const start = now !== null ? announcedStart(e, now) : null;
          return (
            <li
              key={e.round}
              className="calendarcard"
              data-state={state}
              aria-current={state === 'current' ? 'date' : undefined}
            >
              <span className="roundchip">R{pad2(e.round)}</span>
              <div className="calendar-body">
                <p className="calendar-state" data-state={state}>
                  {stateLabel[state]}
                </p>
                <h2 className="card-title">
                  <span aria-hidden="true">{e.flag}</span> {e.country}
                </h2>
                <p>{raceWeekLabel(e)}</p>
                {winner ? (
                  <p className="calendar-winner">
                    Winner · <strong>{winner.driver}</strong>
                  </p>
                ) : (
                  <p>{start ? `Announced start · ${start.label}` : 'Qualifying · Wed 21:00 HKT'}</p>
                )}
                <Link
                  className="text-link"
                  href={roundPath(e.round) + (finished ? '#race' : '')}
                  onClick={(ev) => clientNav(ev, () => onRound(e.round, finished ? 'race' : undefined))}
                >
                  {finished ? 'Results' : 'Round details'}
                  <span className="sr-only">
                    {' '}
                    for Round {e.round}, {e.country}
                  </span>{' '}
                  →
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="footnote">
        Rounds without an announced start are saved as all-day calendar events.
        Announced start times convert to your calendar’s timezone.
      </p>
    </>
  );
}
