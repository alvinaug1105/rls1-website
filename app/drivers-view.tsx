'use client';
import { useMemo, useState } from 'react';
import { calculateStandings, driverId } from './racing';
import { driverStats, type DriverStats } from './race-week';
import { canonical, roster, schedule } from './season';
import { EmptyState, ScrollRegion } from './race-ui';
import { pad2 } from './site';
import type { Entry } from './league';

const stat = (s: DriverStats) =>
  [
    ['Championship', s.position ? `P${s.position}` : '—'],
    ['Points', s.points],
    ['Races', s.starts],
    ['Wins', s.wins],
    ['Podiums', s.podiums],
    ['Poles', s.poles],
    ['Duel wins', s.duelWins],
    ['Fastest Duel laps', s.fastestLaps],
    ['Best finish', s.bestFinish ? `P${s.bestFinish}` : '—'],
    ['Best qualifying', s.bestQualifying ? `P${s.bestQualifying}` : '—'],
  ] as const;

export function DriverProfiles({ data }: { data: Entry[] }) {
  const standings = useMemo(() => calculateStandings(data), [data]);
  const names = useMemo(
    () => [
      ...new Set([
        ...standings.map((r) => r.name),
        ...roster.map((r) => canonical(r.driver)),
      ]),
    ],
    [standings],
  );
  const [chosen, setSelected] = useState<string | null>(null);
  const [rival, setRival] = useState('');
  const selected = chosen ?? standings[0]?.name ?? names[0];
  const stats = useMemo(() => driverStats(data, selected), [data, selected]);
  const other = useMemo(
    () => (rival && rival !== selected ? driverStats(data, rival) : null),
    [data, rival, selected],
  );
  const form = stats.results.slice(-5);
  return (
    <>
      <div className="sectionhead viewheading">
        <div>
          <p className="eyebrow">MEET THE GRID</p>
          <h1 className="page-title">Driver profiles</h1>
          <p className="muted">
            Statistics count published classifications only.
          </p>
        </div>
        <label className="inline-field">
          Driver
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="panel driver-card" aria-labelledby="driver-title">
        <p className="eyebrow">
          {roster.find((r) => canonical(r.driver) === selected)?.team || stats.team || 'RLS1'}
        </p>
        <h2 id="driver-title" className="driver-title">
          {selected}
        </h2>
        {driverId(selected) === driverId('Atlegang') && (
          <p className="muted">Also races as Shawn</p>
        )}
        <dl className="qualstats">
          {stat(stats).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {form.length > 0 && (
          <div className="form-strip">
            <h3 className="eyebrow">FORM · LAST {form.length} RACES</h3>
            <ol>
              {form.map((r) => (
                <li key={r.round} data-podium={r.position <= 3 ? r.position : undefined}>
                  <span>R{pad2(r.round)}</span>
                  <strong>P{r.position}</strong>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
      <section className="panel" aria-labelledby="history-title">
        <h2 id="history-title" className="section-title">
          Race history
        </h2>
        {stats.results.length ? (
          <ScrollRegion className="table-scroll" label="Race history table">
            <table className="timing">
              <thead>
                <tr>
                  <th scope="col">Round</th>
                  <th scope="col">Team at the race</th>
                  <th scope="col" className="num">Finish</th>
                  <th scope="col" className="num">Points</th>
                </tr>
              </thead>
              <tbody>
                {[...stats.results].reverse().map((r) => (
                  <tr key={r.round}>
                    <th scope="row">
                      R{pad2(r.round)} · {schedule[r.round - 1]?.country}
                    </th>
                    <td>{r.team}</td>
                    <td className={`num position p${r.position - 1}`}>P{r.position}</td>
                    <td className="num">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        ) : (
          <EmptyState title="Ready for their first classification">
            Published race results will appear here.
          </EmptyState>
        )}
        <p className="footnote">
          An absent entry does not imply DNS. Team reflects the team entered at
          that race.
        </p>
      </section>
      <section className="panel" aria-labelledby="compare-title">
        <div className="sectionhead">
          <h2 id="compare-title" className="section-title">
            Head to head
          </h2>
          <label className="inline-field">
            Compare {selected} with
            <select value={rival} onChange={(e) => setRival(e.target.value)}>
              <option value="">Choose a driver</option>
              {names
                .filter((n) => n !== selected)
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {other ? (
          <ScrollRegion className="table-scroll" label="Head-to-head table">
            <table className="timing compare">
              <thead>
                <tr>
                  <th scope="col">Statistic</th>
                  <th scope="col" className="num">{selected}</th>
                  <th scope="col" className="num">{other.name}</th>
                </tr>
              </thead>
              <tbody>
                {stat(stats).map(([label, value], i) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td className="num">{value}</td>
                    <td className="num">{stat(other)[i][1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        ) : (
          <p className="muted">
            Pick a second driver to compare published statistics side by side.
          </p>
        )}
      </section>
      <section className="panel" aria-labelledby="grid-title">
        <p className="eyebrow">CURRENT GRID</p>
        <h2 id="grid-title" className="section-title">
          Teams & drivers
        </h2>
        <div className="rostergrid">
          {roster.map((r) => (
            <button
              className="rosteritem"
              key={r.driver}
              aria-pressed={canonical(r.driver) === selected}
              onClick={() => {
                setSelected(canonical(r.driver));
                document.getElementById('driver-title')?.scrollIntoView({ block: 'center' });
              }}
            >
              <strong>{r.driver}</strong>
              <small>{r.team}</small>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
