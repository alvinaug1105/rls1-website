'use client';
import { useState } from 'react';
import { QualifyingCard } from './qualifying-card';
import { fastestDuel, formatLap, sortQual } from './result-utils';
import { schedule, roundTitle, canonical, roundNumber, roster } from './season';
import {
  classification,
  calculateStandings,
  raceEntries,
  events,
  eventStatus,
  nextEvent,
  dateLabel,
  calendarFile,
  downloadFile,
  raceRecap,
  driverId,
} from './racing';
import { EmptyState, CopyButton, ScoringRules, useClock } from './race-ui';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { type Entry } from './league';
const csv = (s: string) => '"' + s.replaceAll('"', '""') + '"';
export function SeasonResults({
  data,
  round,
  onRound,
}: {
  data: Entry[];
  round: number;
  onRound: (r: number) => void;
}) {
  const [view, setView] = useState('overview');
  const event = events(data)[round - 1],
    race = data.find(
      (e) => e.kind === 'race' && e.approved && roundNumber(e.title) === round,
    ),
    q = data.find(
      (e) =>
        e.kind === 'qualifying' && e.approved && roundNumber(e.title) === round,
    );
  const rows = classification(race),
    grid = sortQual(classification(q)),
    duel = fastestDuel(rows),
    leader = calculateStandings(data)[0],
    latest = raceEntries(data).at(-1),
    penalties = data.filter(
      (e) =>
        e.approved && e.kind === 'penalty' && roundNumber(e.title) === round,
    );
  const racePanel = (
    <div className="columns">
      <section className="panel">
        <div className="sectionhead">
          <h3>Race results</h3>
          {race && <span className="badge verified">Published</span>}
        </div>
        {race ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {['POS', 'DRIVER / TEAM', 'POINTS'].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.driver}>
                    <TableCell className={'position p' + i}>P{i + 1}</TableCell>
                    <TableCell>
                      <strong>{r.driver}</strong>
                      <small className="team">{r.team}</small>
                    </TableCell>
                    <TableCell className="time">{r.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="formactions">
              <button
                className="outline"
                onClick={() =>
                  downloadFile(
                    `rls1-round-${round}.csv`,
                    'Position,Driver,Team,Points\r\n' +
                      rows
                        .map((r, i) =>
                          [i + 1, csv(r.driver), csv(r.team), r.points].join(
                            ',',
                          ),
                        )
                        .join('\r\n'),
                    'text/csv;charset=utf-8',
                  )
                }
              >
                Download CSV
              </button>
              <CopyButton text={raceRecap(round, rows)} />
            </div>
          </>
        ) : (
          <EmptyState title="Awaiting the chequered flag.">
            <p>Race control will publish the final classification here.</p>
            <div className="empty-context">
              {q && (
                <button
                  className="outline"
                  onClick={() => setView('qualifying')}
                >
                  View qualifying · {grid.length} drivers
                </button>
              )}
              {leader && (
                <p>
                  Championship leader · <strong>{leader.name}</strong> ·{' '}
                  {leader.points} pts
                </p>
              )}
              {latest && (
                <button
                  className="outline"
                  onClick={() => onRound(roundNumber(latest.title))}
                >
                  Latest result · Round {roundNumber(latest.title)}
                </button>
              )}
            </div>
          </EmptyState>
        )}
      </section>
      <aside className="panel">
        <p className="eyebrow">FASTEST DUEL LAP</p>
        {duel ? (
          <>
            <h3>{duel.driver}</h3>
            <div className="bigtime">{formatLap(duel.duelMs!)}</div>
            <p className="muted">{duel.team}</p>
          </>
        ) : (
          <p className="muted">No duel lap published yet.</p>
        )}
        <ScoringRules />
      </aside>
    </div>
  );
  return (
    <>
      <div className="race-banner">
        <div>
          <p className="eyebrow">
            ROUND {String(round).padStart(2, '0')} / SEASON 01
          </p>
          <h2>{event.country.toUpperCase()}</h2>
          <p>{dateLabel(event.date)}</p>
          <span className="badge verified">{eventStatus(event, data)}</span>
        </div>
        <div className="round-number" aria-hidden="true">
          {String(round).padStart(2, '0')}
        </div>
        <Select value={round} onValueChange={(v) => onRound(Number(v))}>
          <SelectTrigger aria-label="Select race round" className="roundpicker">
            <SelectValue>
              R{round} · {event.country}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {schedule.map((r) => (
              <SelectItem value={r.round} key={r.round}>
                R{r.round} · {r.country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Tabs value={view} onValueChange={(v) => setView(String(v))}>
        <TabsList className="event-tabs">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="race">Race</TabsTrigger>
          <TabsTrigger value="qualifying">Qualifying</TabsTrigger>
          <TabsTrigger value="penalties">
            Penalties ({penalties.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <section className="panel event-overview">
            <div>
              <p className="eyebrow">EVENT INFORMATION</p>
              <p>
                {event.startAt
                  ? `${new Date(event.startAt).toLocaleString('en-GB', { timeZone: 'Asia/Hong_Kong' })} · Hong Kong (UTC+8)`
                  : 'Start time to be announced'}
              </p>
              {event.notes && <p className="storybody">{event.notes}</p>}
            </div>
            <button
              className="outline"
              onClick={() =>
                downloadFile(
                  `rls1-round-${round}.ics`,
                  calendarFile([event]),
                  'text/calendar',
                )
              }
            >
              Add to calendar
            </button>
          </section>
          {racePanel}
          <QualifyingCard
            key={round}
            round={round}
            rows={grid}
            count={grid.length}
          />
        </TabsContent>
        <TabsContent value="race">{racePanel}</TabsContent>
        <TabsContent value="qualifying">
          <QualifyingCard
            key={round}
            round={round}
            rows={grid}
            count={grid.length}
          />
        </TabsContent>
        <TabsContent value="penalties">
          <section className="panel">
            <h3>Steward decisions</h3>
            {!penalties.length ? (
              <EmptyState title="No published steward decisions">
                Any penalties or official notes for this round will appear here.
              </EmptyState>
            ) : (
              penalties.map((p) => {
                let note;
                try {
                  note = JSON.parse(p.body);
                } catch {
                  return null;
                }
                return (
                  <article className="notice" key={p.id}>
                    <span className="badge">{note.type}</span>
                    <h3>{note.driver}</h3>
                    <p className="storybody">{note.reason}</p>
                    <p>
                      <strong>{note.penalty}</strong>
                    </p>
                    {note.note && <p className="muted">{note.note}</p>}
                  </article>
                );
              })
            )}
            <p className="footnote">
              Decisions are recorded here. Only the published classification
              determines championship points.
            </p>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
export function CalendarView({
  data,
  onEvent,
}: {
  data: Entry[];
  onEvent: (r: number) => void;
}) {
  const [filter, setFilter] = useState('all'),
    now = useClock(),
    all = events(data),
    next = now === null ? undefined : nextEvent(data, now),
    visible = all.filter(
      (e) => filter === 'all' || eventStatus(e, data) !== 'FINISHED',
    );
  return (
    <>
      <div className="sectionhead viewheading">
        <div>
          <p className="eyebrow">24 ROUNDS. ONE CHAMPIONSHIP.</p>
          <h2>Season 1 calendar</h2>
          <p className="muted">
            Dates without a start time are saved as all-day calendar events.
            Announced start times convert to your calendar’s timezone.
          </p>
        </div>
        <button
          className="outline"
          onClick={() =>
            downloadFile(
              'rls1-season-1.ics',
              calendarFile(all),
              'text/calendar',
            )
          }
        >
          Add season to calendar
        </button>
      </div>
      <Select value={filter} onValueChange={(v) => setFilter(String(v))}>
        <SelectTrigger aria-label="Filter calendar">
          <SelectValue>
            {filter === 'all' ? 'All rounds' : 'Without final results'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All rounds</SelectItem>
          <SelectItem value="remaining">Without final results</SelectItem>
        </SelectContent>
      </Select>
      <div className="calendargrid">
        {visible.map((e) => (
          <article
            className={
              'calendarcard ' + (e.round === next?.round ? 'current' : '')
            }
            key={e.round}
          >
            <span className="roundchip">R{e.round}</span>
            <div>
              <span className="eyebrow">
                {eventStatus(e, data) === 'FINISHED'
                  ? 'COMPLETED'
                  : e.round === next?.round
                    ? 'NEXT'
                    : eventStatus(e, data) === 'QUALIFYING'
                      ? 'QUALIFYING'
                      : eventStatus(e, data) === 'LIVE'
                        ? 'LIVE'
                        : 'UPCOMING'}
              </span>
              <h3>
                {e.flag} {e.country}
              </h3>
              <p>{dateLabel(e.date)}</p>
              <p>
                {e.startAt
                  ? new Date(e.startAt).toLocaleTimeString('en-GB', {
                      timeZone: 'Asia/Hong_Kong',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) + ' · Hong Kong'
                  : 'Time TBA'}
              </p>
              <button className="outline" onClick={() => onEvent(e.round)}>
                {eventStatus(e, data) === 'FINISHED'
                  ? 'View results'
                  : 'View event'}{' '}
                →
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
export function DriverProfiles({ data }: { data: Entry[] }) {
  const races = raceEntries(data),
    standings = calculateStandings(data),
    names = [
      ...new Set([
        ...roster.map((r) => canonical(r.driver)),
        ...standings.map((r) => r.name),
      ]),
    ];
  const [selected, setSelected] = useState('Winter');
  const history = races.flatMap((e) =>
    classification(e).flatMap((r, i) =>
      driverId(r.driver) === driverId(selected)
        ? [
            {
              ...r,
              position: i + 1,
              round: roundNumber(e.title),
              title: e.title,
            },
          ]
        : [],
    ),
  );
  const standing = standings.find((r) => r.name === selected),
    poles = data.filter(
      (e) =>
        e.approved &&
        e.kind === 'qualifying' &&
        driverId(sortQual(classification(e))[0]?.driver || '') ===
          driverId(selected),
    ).length,
    fastest = races.filter(
      (e) =>
        driverId(fastestDuel(classification(e))?.driver || '') ===
        driverId(selected),
    ).length;
  return (
    <>
      <div className="sectionhead viewheading">
        <div>
          <p className="eyebrow">MEET THE GRID</p>
          <h2>Driver profiles</h2>
        </div>
        <Select value={selected} onValueChange={(v) => setSelected(String(v))}>
          <SelectTrigger aria-label="Select driver">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {names.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <section className="panel">
        <p className="eyebrow">
          {roster.find((r) => canonical(r.driver) === selected)?.team ||
            history.at(-1)?.team}
        </p>
        <h2>{selected}</h2>
        {selected === 'Atlegang' && (
          <p className="muted">Also races as Shawn</p>
        )}
        <div className="qualstats">
          {[
            ['CHAMPIONSHIP', standing ? 'P' + standing.position : '—'],
            ['POINTS', standing?.points || 0],
            ['RACES', history.length],
            ['WINS', standing?.wins || 0],
            ['PODIUMS', standing?.podiums || 0],
            ['POLES', poles],
            ['FASTEST LAPS', fastest],
            [
              'BEST FINISH',
              history.length
                ? 'P' + Math.min(...history.map((r) => r.position))
                : '—',
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h3>Recent race history</h3>
        {history.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                {['ROUND', 'TEAM AT THE RACE', 'FINISH', 'POINTS'].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...history].reverse().map((r) => (
                <TableRow key={r.title}>
                  <TableCell>
                    {roundTitle(r.round).replace('Season 1 — ', '')}
                  </TableCell>
                  <TableCell>{r.team}</TableCell>
                  <TableCell>P{r.position}</TableCell>
                  <TableCell>{r.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="Ready for their first classification">
            Published race results will appear here.
          </EmptyState>
        )}
        <p className="footnote">
          Statistics reflect published classifications. An absent entry does not
          imply DNS.
        </p>
      </section>
      <section className="panel">
        <p className="eyebrow">CURRENT GRID</p>
        <h3>Teams & drivers</h3>
        <div className="rostergrid">
          {roster.map((r) => (
            <button
              className="rosteritem"
              key={r.driver}
              onClick={() => setSelected(canonical(r.driver))}
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
