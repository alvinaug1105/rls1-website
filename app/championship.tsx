/* eslint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/prefer-tag-over-role -- The labeled scroll region is keyboard-focusable; the SVG has an accessible title and a text data table. */
'use client';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  calculateStandings,
  progression,
  raceEntries,
  standingsRecap,
} from './racing';
import { CopyButton, ScoringRules, EmptyState } from './race-ui';
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
export function Championship({ data }: { data: Entry[] }) {
  const rounds = raceEntries(data);
  return (
    <>
      <div className="sectionhead viewheading">
        <div>
          <p className="eyebrow">THE TITLE FIGHT</p>
          <h2>Championship standings</h2>
          <p className="muted">
            After {rounds.length} published rounds · Season 1
          </p>
        </div>
        <ScoringRules />
      </div>
      <Tabs defaultValue="drivers">
        <TabsList>
          <TabsTrigger value="drivers">DRIVERS</TabsTrigger>
          <TabsTrigger value="teams">TEAMS</TabsTrigger>
        </TabsList>
        {[false, true].map((teams) => (
          <TabsContent key={String(teams)} value={teams ? 'teams' : 'drivers'}>
            <section className="panel">
              {!rounds.length ? (
                <EmptyState title="The championship starts on the grid.">
                  Standings appear after the first race classification.
                </EmptyState>
              ) : (
                <>
                  <div
                    className="table-scroll"
                    role="region"
                    aria-label={teams ? 'Team standings' : 'Driver standings'}
                    tabIndex={0}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {[
                            'POS',
                            teams ? 'TEAM' : 'DRIVER / TEAM',
                            'POINTS',
                            'GAP',
                            ...(!teams ? ['WINS', 'PODIUMS'] : []),
                            'CHANGE',
                          ].map((h) => (
                            <TableHead key={h}>{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculateStandings(data, teams).map((r) => (
                          <TableRow key={r.name}>
                            <TableCell
                              className={'position p' + (r.position - 1)}
                            >
                              P{r.position}
                            </TableCell>
                            <TableCell>
                              <strong>{r.name}</strong>
                              {!teams && (
                                <small className="team">{r.team}</small>
                              )}
                            </TableCell>
                            <TableCell>
                              <strong>{r.points}</strong>
                            </TableCell>
                            <TableCell>
                              {r.gap ? `−${r.gap}` : 'Leader'}
                            </TableCell>
                            {!teams && (
                              <>
                                <TableCell>{r.wins}</TableCell>
                                <TableCell>{r.podiums}</TableCell>
                              </>
                            )}
                            <TableCell>
                              <span
                                aria-label={
                                  r.change === null
                                    ? 'No previous position'
                                    : r.change === 0
                                      ? 'Unchanged'
                                      : `${Math.abs(r.change)} positions ${r.change > 0 ? 'gained' : 'lost'}`
                                }
                                className={
                                  r.change && r.change > 0
                                    ? 'gain'
                                    : r.change && r.change < 0
                                      ? 'loss'
                                      : ''
                                }
                              >
                                {r.change === null
                                  ? 'New'
                                  : r.change === 0
                                    ? '—'
                                    : `${r.change > 0 ? '↑' : '↓'} ${Math.abs(r.change)}`}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="footnote">
                    Change compares with standings before the latest published
                    round. Equal points are displayed alphabetically pending
                    official tie-breaks.
                  </p>
                  <CopyButton text={standingsRecap(data, teams)} />
                </>
              )}
            </section>
          </TabsContent>
        ))}
      </Tabs>
      {rounds.length > 1 && <Progression data={data} />}
    </>
  );
}
function Progression({ data }: { data: Entry[] }) {
  const drivers = calculateStandings(data),
    [selected, setSelected] = useState<string[]>(
      drivers.slice(0, 3).map((r) => r.name),
    );
  const series = progression(data),
    active = drivers.filter((d) => selected.includes(d.name)),
    max = Math.max(
      1,
      ...series.flatMap((p) =>
        p.standings
          .filter((d) => selected.includes(d.name))
          .map((d) => d.points),
      ),
    );
  const x = (i: number) => 65 + (i * 710) / Math.max(1, series.length - 1),
    y = (points: number) => 260 - (points / max) * 220;
  return (
    <section className="panel">
      <p className="eyebrow">THE SEASON SO FAR</p>
      <h3>Championship progression</h3>
      <fieldset className="chart-legend">
        <legend className="sr-only">Choose drivers to compare</legend>
        {drivers.map((d, i) => (
          <label
            key={d.name}
            style={{ borderColor: colors[i % colors.length] }}
          >
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
            {d.name}
          </label>
        ))}
      </fieldset>
      {active.length ? (
        <>
          <svg
            className="progress-chart"
            viewBox="0 0 820 310"
            role="img"
            aria-labelledby="progress-title progress-desc"
          >
            <title id="progress-title">Cumulative championship points</title>
            <desc id="progress-desc">
              Round on the horizontal axis and cumulative points on the vertical
              axis. Exact values are listed below.
            </desc>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line
                  x1="65"
                  x2="775"
                  y1={y(max * f)}
                  y2={y(max * f)}
                  stroke="#344155"
                />
                <text
                  x="52"
                  y={y(max * f) + 5}
                  textAnchor="end"
                  fill="#bdc8d8"
                  fontSize="14"
                >
                  {Math.round(max * f)}
                </text>
              </g>
            ))}
            {series.map((p, i) => (
              <text
                key={p.round}
                x={x(i)}
                y="287"
                textAnchor="middle"
                fill="#bdc8d8"
                fontSize="14"
              >
                R{p.round}
              </text>
            ))}
            {active.map((d) => (
              <g key={d.name}>
                <polyline
                  fill="none"
                  stroke={colors[drivers.indexOf(d) % colors.length]}
                  strokeWidth="3"
                  points={series
                    .map(
                      (p, i) =>
                        `${x(i)},${y(p.standings.find((r) => r.name === d.name)?.points || 0)}`,
                    )
                    .join(' ')}
                />
                {series.map((p, i) => (
                  <circle
                    key={p.round}
                    cx={x(i)}
                    cy={y(
                      p.standings.find((r) => r.name === d.name)?.points || 0,
                    )}
                    r="4"
                    fill={colors[drivers.indexOf(d) % colors.length]}
                  />
                ))}
              </g>
            ))}
          </svg>
          <details>
            <summary>View exact progression data</summary>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Round</TableHead>
                  {active.map((d) => (
                    <TableHead key={d.name}>{d.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.map((p) => (
                  <TableRow key={p.round}>
                    <TableCell>R{p.round}</TableCell>
                    {active.map((d) => (
                      <TableCell key={d.name}>
                        {p.standings.find((r) => r.name === d.name)?.points ||
                          0}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>
        </>
      ) : (
        <p className="muted">Select a driver to see their progression.</p>
      )}
    </section>
  );
}
