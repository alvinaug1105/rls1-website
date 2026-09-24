'use client';
import { formatLap, gap, sortQual, type QualRow } from './result-utils';
import { EmptyState, ScrollRegion } from './race-ui';

// Official qualifying classification. Order and gaps come from the shared
// sortQual/gap helpers; this component only presents them.
export function QualifyingCard({ rows }: { rows: QualRow[] }) {
  const grid = sortQual(rows);
  const pole = grid[0];
  return (
    <section className="panel qualifying-panel" aria-labelledby="qualifying-title">
      <div className="sectionhead">
        <div>
          <p className="eyebrow">QUALIFYING</p>
          <h2 id="qualifying-title" className="section-title">
            Qualifying classification
          </h2>
        </div>
        {grid.length > 0 && (
          <span className="badge verified">Official · {grid.length} drivers</span>
        )}
      </div>
      {pole ? (
        <>
          <div className="pole-card">
            <p className="eyebrow">POLE POSITION</p>
            <p className="pole-driver">{pole.driver}</p>
            <p className="team">{pole.team || '—'}</p>
            <p className="pole-lap">
              <span className="sr-only">Best lap </span>
              {pole.ms ? formatLap(pole.ms) : '—'}
            </p>
          </div>
          <ScrollRegion className="table-scroll" label="Qualifying timing table">
            <table className="timing">
              <caption className="sr-only">
                Qualifying classification, fastest first
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="num">Pos</th>
                  <th scope="col">Driver</th>
                  <th scope="col" className="col-team">Team</th>
                  <th scope="col" className="num">Best lap</th>
                  <th scope="col" className="num">Gap</th>
                  <th scope="col" className="num">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {grid.map((r, i) => (
                  <tr key={r.driver} data-podium={i < 3 ? i + 1 : undefined}>
                    <td className={`num position p${i}`}>{i + 1}</td>
                    <th scope="row">
                      <span className="driver-name">{r.driver}</span>
                      <small className="team team-inline">{r.team || '—'}</small>
                    </th>
                    <td className="col-team">{r.team || '—'}</td>
                    <td className={`num time${i === 0 ? ' purple' : ''}`}>
                      {r.ms ? formatLap(r.ms) : '—'}
                    </td>
                    <td className="num">
                      {r.ms && pole.ms ? gap(r.ms, pole.ms) : '—'}
                    </td>
                    <td className="num">{r.attempts ? `${r.attempts}/3` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        </>
      ) : (
        <EmptyState title="Qualifying not published yet">
          Qualifying opens on the Wednesday of race week at 21:00 HKT. The
          official classification appears here once race control publishes it.
        </EmptyState>
      )}
    </section>
  );
}
