'use client';
import {
  calculateStandings,
  nextEvent,
  eventStatus,
  dateLabel,
  raceEntries,
  classification,
  raceWeekWindow,
  RACE_TIME_ZONE,
} from './racing';
import { roundNumber, schedule } from './season';
import { useClock, EmptyState } from './race-ui';
import type { Entry } from './league';
export function Dashboard({
  data,
  onEvent,
  onStandings,
}: {
  data: Entry[];
  onEvent: (round: number) => void;
  onStandings: () => void;
}) {
  const now = useClock(),
    next = now === null ? undefined : nextEvent(data, now),
    leaders = calculateStandings(data).slice(0, 3),
    last = raceEntries(data).at(-1);
  const seconds =
    next?.startAt && now
      ? Math.max(0, Math.floor((Date.parse(next.startAt) - now) / 1000))
      : null;
  return (
    <>
      <div className="dashboard-grid">
        <section className="panel next-race">
          <p className="eyebrow">
            {next &&
            now !== null &&
            now >= raceWeekWindow(next).start &&
            now < raceWeekWindow(next).end
              ? 'CURRENT RACE WEEK'
              : 'NEXT UP'}
          </p>
          {now === null ? (
            <div className="loading-skeleton" aria-live="polite">
              Loading event schedule…
            </div>
          ) : next ? (
            <>
              <div className="sectionhead">
                <span className="roundchip">
                  ROUND {String(next.round).padStart(2, '0')}
                </span>
                <span className="badge verified">
                  {eventStatus(next, data, now)}
                </span>
              </div>
              <h2>{next.country}</h2>
              <p>{dateLabel(next.date)}</p>
              {next.startAt ? (
                <>
                  <p className="muted">
                    {new Intl.DateTimeFormat('en-GB', {
                      timeZone: RACE_TIME_ZONE,
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(next.startAt))}{' '}
                    · Hong Kong time
                  </p>
                  {seconds !== null && seconds > 0 && (
                    <p
                      className="countdown"
                      aria-label={`${Math.floor(seconds / 86400)} days ${Math.floor((seconds % 86400) / 3600)} hours ${Math.floor((seconds % 3600) / 60)} minutes until start`}
                    >
                      {String(Math.floor(seconds / 86400)).padStart(2, '0')}D :{' '}
                      {String(Math.floor((seconds % 86400) / 3600)).padStart(
                        2,
                        '0',
                      )}
                      H :{' '}
                      {String(Math.floor((seconds % 3600) / 60)).padStart(
                        2,
                        '0',
                      )}
                      M
                    </p>
                  )}
                </>
              ) : (
                <p className="muted">Start time to be announced</p>
              )}
              <button className="primary" onClick={() => onEvent(next.round)}>
                View round →
              </button>
            </>
          ) : (
            <EmptyState title="No upcoming event announced">
              Check race control for the next race.
            </EmptyState>
          )}
        </section>
        <section className="panel">
          <p className="eyebrow">CHAMPIONSHIP LEADERS</p>
          <h3>The title fight</h3>
          {leaders.length ? (
            leaders.map((r) => (
              <div className="leader-row" key={r.name}>
                <span className={'position p' + (r.position - 1)}>
                  P{r.position}
                </span>
                <div>
                  <strong>{r.name}</strong>
                  <small className="team">
                    {r.gap ? `${r.gap} points behind` : 'Championship leader'}
                  </small>
                </div>
                <strong>
                  {r.points}
                  <small className="team">PTS</small>
                </strong>
              </div>
            ))
          ) : (
            <p className="muted">Standings appear after the first race.</p>
          )}
          <button className="outline" onClick={onStandings}>
            Full standings →
          </button>
        </section>
      </div>
      {last && (
        <section className="panel latest-round">
          <div>
            <p className="eyebrow">LATEST COMPLETED ROUND</p>
            <h3>
              R{roundNumber(last.title)} ·{' '}
              {schedule[roundNumber(last.title) - 1]?.country}
            </h3>
            <p className="muted">Winner · {classification(last)[0]?.driver}</p>
          </div>
          <button
            className="outline"
            onClick={() => onEvent(roundNumber(last.title))}
          >
            View race results →
          </button>
        </section>
      )}
    </>
  );
}
