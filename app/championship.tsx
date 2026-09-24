'use client';
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  calculateStandings,
  progression,
  raceEntries,
  type Standing,
} from './racing';
import { roundNumber, SEASON } from './season';
import { ScoringRules, EmptyState, ScrollRegion } from './race-ui';
import { pad2 } from './site';
import type { Entry } from './league';
const colors = [
  '#ff766e',
  '#c4a4ff',
  '#7ae2ba',
  '#f4cf7e',
  '#85c8ff',
  '#f9a9d3',
  '#c3d4ec',
  '#b5d787',
];
function Movement({ change }: { change: number | null }) {
  const text =
    change === null
      ? 'New this round'
      : change === 0
        ? 'Unchanged'
        : `${Math.abs(change)} ${Math.abs(change) === 1 ? 'place' : 'places'} ${change > 0 ? 'gained' : 'lost'}`;
  return (
    <span className={change && change > 0 ? 'gain' : change && change < 0 ? 'loss' : 'flat'}>
      <span aria-hidden="true">
        {change === null ? 'NEW' : change === 0 ? '—' : `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}`}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
function Board({ rows, teams }: { rows: Standing[]; teams: boolean }) {
  return (
    <>
      <ol className="championship-podium">
        {rows.slice(0, 3).map((r) => (
          <li key={r.name} className={`podium-card podium-${r.position}`}>
            <span className="podium-pos">P{r.position}</span>
            <h3>{r.name}</h3>
            {!teams && <p className="muted">{r.team}</p>}
            <p className="podium-points">
              {r.points}
              <span>PTS</span>
            </p>
            <p className="podium-meta">
              {r.gap ? `−${r.gap} to leader` : 'Championship leader'} · {r.wins}{' '}
              {r.wins === 1 ? 'win' : 'wins'} · {r.podiums}{' '}
              {r.podiums === 1 ? 'podium' : 'podiums'}
            </p>
          </li>
        ))}
      </ol>
      <ScrollRegion className="table-scroll" label={teams ? 'Team standings' : 'Driver standings'}>
        <table className="timing standings-table">
          <caption className="sr-only">
            {teams ? 'Teams' : 'Drivers'} championship standings
          </caption>
          <thead>
            <tr>
              <th scope="col" className="num">Pos</th>
              <th scope="col">{teams ? 'Team' : 'Driver'}</th>
              {!teams && <th scope="col" className="col-team">Team</th>}
              <th scope="col" className="num">Points</th>
              <th scope="col" className="num">Gap</th>
              <th scope="col" className="num">Wins</th>
              <th scope="col" className="num">Podiums</th>
              <th scope="col" className="num">Move</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} data-podium={r.position <= 3 ? r.position : undefined}>
                <td className={`num position p${r.position - 1}`}>{r.position}</td>
                <th scope="row">
                  <span className="driver-name">{r.name}</span>
                  {!teams && <small className="team team-inline">{r.team}</small>}
                </th>
                {!teams && <td className="col-team">{r.team}</td>}
                <td className="num points">{r.points}</td>
                <td className="num">{r.gap ? `−${r.gap}` : 'Leader'}</td>
                <td className="num">{r.wins}</td>
                <td className="num">{r.podiums}</td>
                <td className="num">
                  <Movement change={r.change} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </>
  );
}
export function Championship({ data }: { data: Entry[] }) {
  const rounds = useMemo(() => raceEntries(data), [data]);
  const drivers = useMemo(() => calculateStandings(data), [data]);
  const teams = useMemo(() => calculateStandings(data, true), [data]);
  const last = rounds.at(-1);
  return (
    <>
      <div className="sectionhead viewheading">
        <div>
          <p className="eyebrow">THE TITLE FIGHT</p>
          <h1 className="page-title">Championship standings</h1>
          <p className="muted">
            {SEASON.label} ·{' '}
            {last
              ? `after Round ${pad2(roundNumber(last.title))} · ${rounds.length} published ${rounds.length === 1 ? 'race' : 'races'}`
              : 'no races published yet'}
          </p>
        </div>
        <ScoringRules />
      </div>
      {!rounds.length ? (
        <section className="panel">
          <EmptyState title="The championship starts on the grid.">
            Standings appear after the first race classification.
          </EmptyState>
        </section>
      ) : (
        <>
          <Tabs defaultValue="drivers">
            <TabsList className="event-tabs" aria-label="Championship">
              <TabsTrigger value="drivers">Drivers</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>
            <TabsContent value="drivers">
              <section className="panel" aria-labelledby="wdc-title">
                <h2 id="wdc-title" className="sr-only">Drivers’ championship</h2>
                <Board rows={drivers} teams={false} />
              </section>
            </TabsContent>
            <TabsContent value="teams">
              <section className="panel" aria-labelledby="wcc-title">
                <h2 id="wcc-title" className="sr-only">Teams’ championship</h2>
                <Board rows={teams} teams />
              </section>
            </TabsContent>
          </Tabs>
          <p className="footnote">
            Move compares with the standings before the latest published round.
            Equal points are listed alphabetically until race control confirms a
            tie-break.
          </p>
          {rounds.length > 1 && <Progression data={data} drivers={drivers} />}
        </>
      )}
    </>
  );
}
function Progression({ data, drivers }: { data: Entry[]; drivers: Standing[] }) {
  const [selected, setSelected] = useState<string[]>(() =>
    drivers.slice(0, 3).map((r) => r.name),
  );
  const series = useMemo(() => progression(data), [data]);
  const active = drivers.filter((d) => selected.includes(d.name));
  const pointsAt = (p: (typeof series)[number], name: string) =>
    p.standings.find((r) => r.name === name)?.points ?? 0;
  const max = Math.max(
    1,
    ...series.flatMap((p) => active.map((d) => pointsAt(p, d.name))),
  );
  const color = (d: Standing) => colors[drivers.indexOf(d) % colors.length];
  const left = 60,
    right = 640,
    top = 24,
    bottom = 290;
  const x = (i: number) => left + (i * (right - left)) / Math.max(1, series.length - 1),
    y = (points: number) => bottom - (points / max) * (bottom - top);
  // Direct labels at the end of each line, nudged apart so close totals stay legible.
  const labels = active
    .map((d) => ({ d, y: y(pointsAt(series.at(-1)!, d.name)) }))
    .sort((a, b) => a.y - b.y);
  labels.forEach((l, i) => {
    if (i && l.y - labels[i - 1].y < 22) l.y = labels[i - 1].y + 22;
  });
  const every = series.length > 12 ? 2 : 1;
  return (
    <section className="panel" aria-labelledby="progress-heading">
      <p className="eyebrow">THE SEASON SO FAR</p>
      <h2 id="progress-heading" className="section-title">
        Championship progression
      </h2>
      <fieldset className="chart-legend">
        <legend>Drivers shown</legend>
        {drivers.map((d) => (
          <label key={d.name} style={{ borderColor: color(d) }}>
            <input
              type="checkbox"
              checked={selected.includes(d.name)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, d.name]
                    : selected.filter((n) => n !== d.name),
                )
              }
            />
            <span className="swatch" style={{ background: color(d) }} aria-hidden="true" />
            {d.name}
          </label>
        ))}
      </fieldset>
      {active.length ? (
        <>
          <ScrollRegion className="chart-scroll" label="Progression chart">
          <svg
            className="progress-chart"
            viewBox="0 0 820 330"
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Inline SVG chart exposed as one image with <title>/<desc>; exact values are in the table below.
            role="img"
            aria-labelledby="progress-title progress-desc"
          >
            <title id="progress-title">Cumulative championship points by round</title>
            <desc id="progress-desc">
              {active
                .map((d) => `${d.name}: ${pointsAt(series.at(-1)!, d.name)} points`)
                .join('; ')}
              . Exact values per round are in the table below the chart.
            </desc>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={left} x2={right} y1={y(max * f)} y2={y(max * f)} className="grid-line" />
                <text x={left - 12} y={y(max * f) + 6} textAnchor="end" className="axis-label">
                  {Math.round(max * f)}
                </text>
              </g>
            ))}
            {series.map((p, i) =>
              i % every === 0 || i === series.length - 1 ? (
                <text key={p.round} x={x(i)} y={bottom + 30} textAnchor="middle" className="axis-label">
                  R{p.round}
                </text>
              ) : null,
            )}
            {active.map((d) => (
              <g key={d.name}>
                <polyline
                  fill="none"
                  stroke={color(d)}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  points={series.map((p, i) => `${x(i)},${y(pointsAt(p, d.name))}`).join(' ')}
                />
                {series.map((p, i) => (
                  <circle key={p.round} cx={x(i)} cy={y(pointsAt(p, d.name))} r="5" fill={color(d)}>
                    <title>{`${d.name} · after R${p.round}: ${pointsAt(p, d.name)} pts`}</title>
                  </circle>
                ))}
              </g>
            ))}
            {labels.map(({ d, y: ly }) => (
              <text key={d.name} x={right + 14} y={ly + 6} className="line-label" fill={color(d)}>
                {d.name} · {pointsAt(series.at(-1)!, d.name)}
              </text>
            ))}
          </svg>
          </ScrollRegion>
          <p className="footnote">
            Only rounds with a published race are plotted.
          </p>
          <details>
            <summary>Exact points by round</summary>
            <ScrollRegion className="table-scroll" label="Progression data">
              <table className="timing">
                <thead>
                  <tr>
                    <th scope="col">Round</th>
                    {active.map((d) => (
                      <th scope="col" className="num" key={d.name}>
                        {d.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {series.map((p) => (
                    <tr key={p.round}>
                      <th scope="row">R{pad2(p.round)}</th>
                      {active.map((d) => (
                        <td className="num" key={d.name}>
                          {pointsAt(p, d.name)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
          </details>
        </>
      ) : (
        <p className="muted">Select at least one driver to see their progression.</p>
      )}
    </section>
  );
}
