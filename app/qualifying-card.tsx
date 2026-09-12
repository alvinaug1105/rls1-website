/* eslint-disable nextjs/no-img-element -- The image is a generated canvas data URL; it cannot use server image optimization. */
'use client';
import { PngExport } from './png-export';
import { drawResultGraphic, qualifyingGraphic } from './result-png';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatLap, gap, sortQual, type QualRow } from './result-utils';
import { CopyButton } from './race-ui';
import { qualifyingRecap } from './racing';
export function QualifyingCard({
  round,
  rows,
  partial = false,
  count = rows.length,
}: {
  round: number;
  rows: QualRow[];
  partial?: boolean;
  count?: number;
}) {
  const grid = sortQual(rows);
  return (
    <section className="panel qualifying-panel">
      <div className="sectionhead">
        <div>
          <p className="eyebrow">THE STARTING GRID</p>
          <h3>Qualifying results</h3>
        </div>
        <span className={'badge ' + (!partial ? 'verified' : '')}>
          {!grid.length
            ? 'Awaiting results'
            : partial
              ? 'Announcement summary'
              : 'Full classification'}
        </span>
      </div>
      {grid.length ? (
        <>
          <div className="qualstats">
            <div>
              <span>POLE POSITION</span>
              <strong>{grid[0].driver}</strong>
            </div>
            <div>
              <span>BEST LAP</span>
              <strong className="purple">
                {grid[0].ms ? formatLap(grid[0].ms) : '—'}
              </strong>
            </div>
            <div>
              <span>DRIVERS</span>
              <strong>{count}</strong>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {['POS', 'DRIVER / TEAM', 'ATTEMPTS', 'BEST LAP', 'GAP'].map(
                  (h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {grid.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className={'position p' + i}>{i + 1}</TableCell>
                  <TableCell>
                    <strong>{r.driver}</strong>
                    <small className="team">{r.team || '—'}</small>
                  </TableCell>
                  <TableCell>{r.attempts ? `${r.attempts}/3` : '—'}</TableCell>
                  <TableCell className="time">
                    {r.ms ? formatLap(r.ms) : '—'}
                  </TableCell>
                  <TableCell>
                    {r.ms && grid[0].ms ? gap(r.ms, grid[0].ms) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="formactions">
            <PngExport
              label="Save Qualifying PNG"
              filename={`RLS1-S1-R${round}-qualifying.png`}
              draw={(canvas) =>
                drawResultGraphic(
                  canvas,
                  qualifyingGraphic(round, grid, partial, count),
                )
              }
            />
            <CopyButton text={qualifyingRecap(round, grid)} />
          </div>
          {partial && (
            <p className="footnote">
              The full classification will appear after race control publishes
              it.
            </p>
          )}
        </>
      ) : (
        <p className="muted">
          No qualifying classification published for this round.
        </p>
      )}
    </section>
  );
}
