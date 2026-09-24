'use client';
import { formatLap } from './result-utils';
import { EmptyState, ScoringRules, ScrollRegion } from './race-ui';
import type { Row } from './league';
import type { RoundSummary } from './race-week';

type RaceRow = Row & { time?: string; gap?: string };

// Official race classification presented as a timing board. Rows stay in the
// published finishing order and points are exactly as published (bonuses and
// penalties are already included by race control).
export function RaceClassification({
  rows,
  fastest,
}: {
  rows: RaceRow[];
  fastest?: RoundSummary['fastestLap'];
}) {
  const timed = rows.some((r) => r.time || r.gap);
  return (
    <div className="columns">
      <section className="panel race-panel" aria-labelledby="race-title">
        <div className="sectionhead">
          <div>
            <p className="eyebrow">RACE</p>
            <h2 id="race-title" className="section-title">
              Official classification
            </h2>
          </div>
          {rows.length > 0 && <span className="badge verified">Official · {rows.length} classified</span>}
        </div>
        {rows.length ? (
          <ScrollRegion className="table-scroll" label="Race timing table">
            <table className="timing">
              <caption className="sr-only">Race classification in finishing order</caption>
              <thead>
                <tr>
                  <th scope="col" className="num">Pos</th>
                  <th scope="col">Driver</th>
                  <th scope="col" className="col-team">Team</th>
                  {timed && <th scope="col" className="num">Time / gap</th>}
                  <th scope="col" className="num">Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isFastest =
                    fastest?.source === 'race' && fastest.driver === r.driver;
                  return (
                    <tr key={r.driver} data-podium={i < 3 ? i + 1 : undefined}>
                      <td className={`num position p${i}`}>{i + 1}</td>
                      <th scope="row">
                        <span className="driver-name">{r.driver}</span>
                        {isFastest && (
                          <span className="lap-flag" title="Fastest Duel lap">
                            <span aria-hidden="true">◷</span> Fastest lap
                          </span>
                        )}
                        <small className="team team-inline">{r.team || '—'}</small>
                      </th>
                      <td className="col-team">{r.team || '—'}</td>
                      {timed && <td className="num time">{r.gap || r.time || '—'}</td>}
                      <td className="num points">{Number.isFinite(r.points) ? r.points : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollRegion>
        ) : (
          <EmptyState title="Awaiting the chequered flag">
            Race control publishes the official classification after the race.
          </EmptyState>
        )}
      </section>
      <aside className="panel fastest-panel" aria-labelledby="fastest-title">
        <p className="eyebrow" id="fastest-title">
          FASTEST DUEL LAP
        </p>
        {fastest ? (
          <>
            <p className="fastest-driver">{fastest.driver}</p>
            <p className="bigtime">{formatLap(fastest.ms)}</p>
            {fastest.team && <p className="muted">{fastest.team}</p>}
            <p className="footnote">
              {fastest.source === 'race'
                ? 'Recorded in the official race classification.'
                : 'From the published Duel bracket.'}
            </p>
          </>
        ) : (
          <p className="muted">No Duel lap published yet.</p>
        )}
        <ScoringRules />
      </aside>
    </div>
  );
}
