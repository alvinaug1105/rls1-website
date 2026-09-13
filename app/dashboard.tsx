'use client';
import { SessionCountdown } from './session-countdown';
import { StatusBadge } from './status-badge';
import {
  calculateStandings,
  nextEvent,
  eventStatus,
  dateLabel,
  raceEntries,
  classification,
  raceWeekWindow,
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
                <StatusBadge status={eventStatus(next, data, now)} />
              </div>
              <h2>{next.country}</h2>
              <p className="race-week-caption">
                Wednesday–Sunday · Hong Kong league time
              </p>
              <p>{dateLabel(next.date)}</p>
              <SessionCountdown event={next} data={data} />
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
