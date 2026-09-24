'use client';
import { useMemo, useState } from 'react';
import type { Entry } from './league';
import { RACE_TIME_ZONE } from './racing';
import { roundNumber, schedule } from './season';
import { BrowserLink as Link, clientNav } from './browser-link';
import { pad2, roundPath } from './site';

// Official communication categories come from the record kind; nothing is
// guessed from free text. Community posts live in Videos/Paddock instead.
export type Communication = {
  id: string;
  category: 'OFFICIAL' | 'STEWARDING';
  title: string;
  summary: string;
  decision?: string;
  body: string;
  created: string;
  when: string;
  round: number;
};
const stamp = new Intl.DateTimeFormat('en-GB', {
  timeZone: RACE_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const when = (created: string) => {
  const t = Date.parse(created);
  return Number.isFinite(t) ? `${stamp.format(t)} HKT` : '';
};

export function latestCommunications(data: Entry[]): Communication[] {
  return data
    .filter((e) => e.approved === 1 && (e.kind === 'notice' || e.kind === 'penalty'))
    .flatMap((e): Communication[] => {
      if (e.kind === 'notice')
        return [
          {
            id: e.id,
            category: 'OFFICIAL',
            title: e.title,
            summary: e.body,
            body: e.body,
            created: e.created,
            when: when(e.created),
            round: roundNumber(e.title),
          },
        ];
      try {
        const d = JSON.parse(e.body) as Record<string, unknown>;
        const text = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '');
        const round = roundNumber(e.title);
        return [
          {
            id: e.id,
            category: 'STEWARDING',
            title: `${text('type') || 'Decision'} · ${text('driver')}`,
            summary: `${text('penalty')} — ${text('reason')}`,
            decision: text('penalty'),
            body: [text('reason'), text('note')].filter(Boolean).join('\n\n'),
            created: e.created,
            when: when(e.created),
            round,
          },
        ];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.created.localeCompare(a.created));
}

export function Noticeboard({
  data,
  onRound,
}: {
  data: Entry[];
  onRound: (round: number, tab?: string) => void;
}) {
  const [filter, setFilter] = useState<'ALL' | Communication['category']>('ALL');
  const all = useMemo(() => latestCommunications(data), [data]);
  const items = all.filter((c) => filter === 'ALL' || c.category === filter);
  return (
    <>
      <div className="viewheading">
        <p className="eyebrow">RACE CONTROL</p>
        <h1 className="page-title">Noticeboard</h1>
        <p className="muted">
          Official announcements and steward decisions from race control. Times
          are Hong Kong time.
        </p>
      </div>
      <div className="notice-grid">
        <section className="panel" aria-labelledby="feed-title">
          <div className="sectionhead">
            <h2 id="feed-title" className="section-title">
              Official communications
            </h2>
            <fieldset className="segmented">
              <legend className="sr-only">Filter communications</legend>
              {(['ALL', 'OFFICIAL', 'STEWARDING'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f === 'ALL' ? 'All' : f === 'OFFICIAL' ? 'Official' : 'Stewarding'}
                </button>
              ))}
            </fieldset>
          </div>
          {items.length ? (
            <ol className="feed">
              {items.map((c) => (
                <li key={c.id}>
                  <article className="notice" data-category={c.category}>
                    <p className="notice-meta">
                      <span className="category-chip" data-category={c.category}>
                        {c.category}
                      </span>
                      {c.when && <time dateTime={c.created}>{c.when}</time>}
                    </p>
                    <h3>{c.title}</h3>
                    {c.category === 'STEWARDING' ? (
                      <>
                        <p className="decision">{c.decision}</p>
                        <p className="storybody">{c.body}</p>
                        {c.round > 0 && (
                          <Link
                            className="text-link"
                            href={`${roundPath(c.round)}#stewarding`}
                            onClick={(e) =>
                              clientNav(e, () => onRound(c.round, 'stewarding'))
                            }
                          >
                            Round {pad2(c.round)} · {schedule[c.round - 1]?.country}
                          </Link>
                        )}
                      </>
                    ) : (
                      <p className="storybody">{c.body}</p>
                    )}
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">
              No {filter === 'ALL' ? 'official communications' : filter.toLowerCase() + ' items'} yet.
              Round deadlines, Duel matchups and steward decisions are posted here.
            </p>
          )}
        </section>
        <section className="panel" aria-labelledby="guide-title">
          <p className="eyebrow">LEAGUE QUICK GUIDE</p>
          <h2 id="guide-title" className="section-title">
            Before you take to the grid
          </h2>
          <ul className="guide">
            <li>Up to three qualifying attempts.</li>
            <li>Submit improved times within 30 minutes.</li>
            <li>Include the required screenshots and random flag.</li>
            <li>Agree your duel time with your opponent.</li>
            <li>Both drivers must agree on the duel result.</li>
          </ul>
          <p className="footnote">
            Qualifying opens Wednesday 21:00 HKT. Official submissions remain in
            Discord’s submission-rls1 channel; check race control for the
            current deadline.
          </p>
        </section>
      </div>
    </>
  );
}
