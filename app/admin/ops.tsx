'use client';
import { useMemo } from 'react';
import { SessionCountdown } from '../session-countdown';
import { StageTimeline } from '../stage-timeline';
import { StatusBadge } from '../status-badge';
import { duelBracket, duelSeeds, publishedDuel, qualifyingFor } from '../duel';
import { events, eventStatus, raceEntries } from '../racing';
import { raceWeekLabel, raceWeekStages, roundSummary } from '../race-week';
import { mediaGraphics } from '../media';
import { announcedStart } from '../session';
import { roundNumber, schedule } from '../season';
import { pad2, roundPath } from '../site';
import type { Entry } from '../league';
import { BrowserLink as Link } from '../browser-link';

type Tone = 'done' | 'attention' | 'waiting';
const marks: Record<Tone, string> = { done: '✓', attention: '!', waiting: '—' };

// Operations overview for one round. It only reads published state through the
// shared rules and deep-links into the specialist editors; it never edits.
export function RoundControl({
  data,
  round,
  current,
  now,
}: {
  data: Entry[];
  round: number;
  current?: number;
  now: number;
}) {
  const event = events(data)[round - 1];
  const summary = useMemo(() => roundSummary(data, round), [data, round]);
  const status = eventStatus(event, data, now);
  const q = qualifyingFor(data, round);
  const duel = publishedDuel(data, round);
  const decided = duel
    ? duelBracket(duelSeeds(data, round), duel.winners).filter((m) => m.winner && !m.bye).length
    : 0;
  const playable = duelBracket(duelSeeds(data, round), duel?.winners).filter(
    (m) => m.players.length === 2 || !m.ready,
  ).length;
  const latestRace = raceEntries(data).at(-1);
  const media = mediaGraphics(data, round);
  const ready = media.filter((g) => g.available).length;
  const pending = data.filter(
    (e) => ['story', 'video'].includes(e.kind) && e.approved === 0,
  ).length;
  const start = announcedStart(event, now);
  const rows: { label: string; tone: Tone; text: string; href: string; action: string }[] = [
    {
      label: 'Event',
      tone: 'done',
      text: `${raceWeekLabel(event)}${start ? ` · start ${start.label}` : ' · start not announced'}`,
      href: `/admin/events?round=${round}`,
      action: 'Edit event',
    },
    {
      label: 'Qualifying',
      tone: q ? 'done' : status === 'QUALIFYING' ? 'attention' : 'waiting',
      text: q ? `Published · ${summary.qualifying.length} drivers · pole ${summary.pole?.driver}` : 'Not published',
      href: `/admin/qualifying?round=${round}`,
      action: q ? 'Review' : 'Publish',
    },
    {
      label: 'Duel',
      tone: summary.duelStale
        ? 'attention'
        : summary.duelWinner
          ? 'done'
          : q && status === 'DUEL'
            ? 'attention'
            : 'waiting',
      text: summary.duelStale
        ? 'Needs republishing — qualifying changed after publication'
        : summary.duelWinner
          ? `Complete · winner ${summary.duelWinner.driver}`
          : duel
            ? `In progress · ${decided} of ${playable} matches decided`
            : q
              ? 'Seeded · not published'
              : 'Awaiting qualifying',
      href: `/admin/duel?round=${round}`,
      action: 'Operate Duel',
    },
    {
      label: 'Race',
      tone: summary.raceWinner ? 'done' : status === 'RACE' || status === 'LIVE' ? 'attention' : 'waiting',
      text: summary.raceWinner
        ? `Published · ${summary.race.length} classified · winner ${summary.raceWinner.driver}`
        : 'Awaiting result',
      href: `/admin/results?round=${round}`,
      action: summary.raceWinner ? 'Review' : 'Publish result',
    },
    {
      label: 'Stewarding',
      tone: 'done',
      text: summary.decisions
        ? `${summary.decisions} published ${summary.decisions === 1 ? 'decision' : 'decisions'}`
        : 'No published decisions',
      href: `/admin/stewarding?round=${round}`,
      action: 'Stewarding',
    },
    {
      label: 'Championship',
      tone: summary.raceWinner ? 'done' : 'waiting',
      text: latestRace
        ? `Standings include races through Round ${pad2(roundNumber(latestRace.title))}${summary.raceWinner ? '' : ' · updates when this race is published'}`
        : 'No races published',
      href: '/admin/standings',
      action: 'Standings',
    },
    {
      label: 'Media',
      tone: ready === media.length ? 'done' : ready ? 'attention' : 'waiting',
      text: `${ready} of ${media.length} graphics ready`,
      href: `/admin/media?round=${round}`,
      action: 'Media Centre',
    },
  ];
  return (
    <>
      <section className="panel ops-hero" aria-labelledby="ops-title">
        <div className="ops-head">
          <div>
            <p className="eyebrow">
              {round === current ? 'CURRENT ROUND' : 'ROUND CONTROL'} · {raceWeekLabel(event)}
            </p>
            <h2 id="ops-title" className="ops-title">
              Round {pad2(round)} — {event.country}
            </h2>
          </div>
          <StatusBadge status={status} />
        </div>
        <form className="ops-picker" method="get" action="/admin">
          <label htmlFor="ops-round">Round</label>
          <select
            id="ops-round"
            name="round"
            defaultValue={round}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            {schedule.map((r) => (
              <option key={r.round} value={r.round}>
                R{pad2(r.round)} · {r.country}
                {r.round === current ? ' (current)' : ''}
              </option>
            ))}
          </select>
          <noscript>
            <button className="outline">Open</button>
          </noscript>
        </form>
        <StageTimeline stages={raceWeekStages(event, data, now)} />
        {round === current && <SessionCountdown event={event} data={data} />}
        <div className="ops-actions" aria-label="Quick actions">
          <Link className="primary" href={`/admin/qualifying?round=${round}`}>Qualifying</Link>
          <Link className="primary" href={`/admin/duel?round=${round}`}>Duel</Link>
          <Link className="primary" href={`/admin/results?round=${round}`}>Race result</Link>
          <Link className="outline" href={`/admin/stewarding?round=${round}`}>Stewarding</Link>
          <Link className="outline" href={`/admin/media?round=${round}`}>Media Centre</Link>
          <Link className="outline" href={roundPath(round)} target="_blank" rel="noopener">
            Public round page ↗
          </Link>
        </div>
      </section>
      <div className="ops-grid">
        <section className="panel" aria-labelledby="pub-title">
          <h2 id="pub-title" className="section-title">
            Publication status
          </h2>
          <ul className="ops-status">
            {rows.map((r) => (
              <li key={r.label} data-tone={r.tone}>
                <span className="ops-mark" aria-hidden="true">
                  {marks[r.tone]}
                </span>
                <span className="ops-label">
                  {r.label}
                  <span className="sr-only">
                    {r.tone === 'done' ? ' (done)' : r.tone === 'attention' ? ' (needs attention)' : ' (waiting)'}
                  </span>
                </span>
                <span className="ops-text">{r.text}</span>
                <Link className="text-link" href={r.href}>
                  {r.action}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel" aria-labelledby="pending-title">
          <h2 id="pending-title" className="section-title">
            Pending
          </h2>
          <ul className="ops-status">
            <li data-tone={pending ? 'attention' : 'done'}>
              <span className="ops-mark" aria-hidden="true">
                {pending ? '!' : '✓'}
              </span>
              <span className="ops-label">Guest submissions</span>
              <span className="ops-text">
                {pending ? `${pending} awaiting moderation` : 'Nothing to review'}
              </span>
              <Link className="text-link" href="/admin/submissions">
                Review
              </Link>
            </li>
            <li data-tone={summary.duelStale ? 'attention' : 'done'}>
              <span className="ops-mark" aria-hidden="true">
                {summary.duelStale ? '!' : '✓'}
              </span>
              <span className="ops-label">Bracket integrity</span>
              <span className="ops-text">
                {summary.duelStale
                  ? 'Published Duel no longer matches qualifying'
                  : 'No stale Duel for this round'}
              </span>
              <Link className="text-link" href={`/admin/duel?round=${round}`}>
                Duel
              </Link>
            </li>
          </ul>
          <p className="footnote">
            Every publish is checked again on the server. Stale edits are
            rejected with a reload prompt.
          </p>
        </section>
      </div>
    </>
  );
}
