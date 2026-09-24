'use client';
import { useState } from 'react';
import type { Entry, League } from './league';
import {
  duelSeeds,
  duelBracket,
  publishedDuel,
  qualifyingFor,
  validateDuel,
  duelFastest,
  type DuelRecord,
  type MatchId,
} from './duel';
import { roundNumber, roundTitle, schedule } from './season';
import { EmptyState } from './race-ui';
import { formatLap, parseLap } from './result-utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
const stageTitles: [string, number[]][] = [
  ['Quarter-finals', [0, 1, 2, 3]],
  ['Semi-finals', [4, 5]],
  ['Final', [6]],
];
export function DuelView({
  data,
  round,
  draft,
  onWinner,
}: {
  data: Entry[];
  round: number;
  draft?: DuelRecord;
  onWinner?: (id: MatchId, driver: string) => void;
}) {
  const seeds = duelSeeds(data, round),
    record = draft || publishedDuel(data, round);
  if (seeds.length < 2)
    return (
      <section className="panel duel-panel" aria-labelledby={`duel-title-${round}`}>
        <p className="eyebrow">DUEL</p>
        <h2 id={`duel-title-${round}`} className="section-title">
          Duel bracket
        </h2>
        <EmptyState title="Awaiting qualifying classification">
          The top eight qualifiers are seeded into the Duel (P1 v P8, P4 v P5,
          P2 v P7, P3 v P6). At least two classified drivers are needed.
        </EmptyState>
      </section>
    );
  const matches = duelBracket(seeds, record?.winners),
    champion = matches[6].winner,
    fastest = duelFastest(record);
  const seed = (driver: string) => seeds.findIndex((s) => s.driver === driver) + 1;
  const stale =
    !draft &&
    !record &&
    data.some(
      (e) =>
        e.kind === 'duel' && e.approved === 1 && roundNumber(e.title) === round,
    );
  const state = stale
    ? 'Qualifying was updated after this bracket was published. Race control must review and republish it.'
    : !record
      ? 'Bracket seeded from qualifying · awaiting results.'
      : champion
        ? 'Duel complete.'
        : 'Duel in progress.';
  return (
    <section className="panel duel-panel" aria-labelledby={`duel-title-${round}`}>
      <div className="sectionhead">
        <div>
          <p className="eyebrow">DUEL</p>
          <h2 id={`duel-title-${round}`} className="section-title">
            Duel bracket
          </h2>
        </div>
        <span className={`badge${champion ? ' verified' : ''}`}>
          {draft ? 'Draft preview' : champion ? 'Complete' : record ? 'In progress' : 'Seeded'}
        </span>
      </div>
      <p className={stale ? 'formstatus' : 'muted'}>
        {state}{' '}
        {seeds.length < 8
          ? `${seeds.length} qualifiers · empty slots are byes.`
          : 'Top eight qualifiers.'}
      </p>
      <div className="duel-bracket">
        {stageTitles.map(([title, ids]) => (
          <section className="duel-column" key={title} aria-label={title}>
            <h3 className="duel-stage">{title}</h3>
            <ol className="duel-matches">
              {ids.map((index) => {
                const m = matches[index];
                const summary = !m.ready
                  ? 'awaiting previous match'
                  : !m.players.length
                    ? 'empty slot'
                    : m.bye
                      ? `${m.players[0].driver} advances with a bye`
                      : m.winner
                        ? `won by ${m.winner.driver}`
                        : 'result pending';
                return (
                  <li key={m.id}>
                    <article
                      className="duel-match"
                      data-decided={m.winner ? 'true' : undefined}
                      aria-label={`${m.id}: ${m.players.map((p) => `${p.driver} (qualified P${seed(p.driver)})`).join(' versus ') || 'no drivers'}, ${summary}`}
                    >
                      <p className="duel-match-id">
                        {m.id}
                        {m.bye ? ' · BYE' : ''}
                      </p>
                      {m.players.map((p) => {
                        const won = m.winner?.driver === p.driver;
                        const out = !!m.winner && !won;
                        return (
                          <div
                            className={`duel-player${won ? ' duel-winner' : ''}${out ? ' duel-eliminated' : ''}`}
                            key={p.driver}
                          >
                            <span className="seed" title={`Qualified P${seed(p.driver)}`}>
                              P{seed(p.driver)}
                            </span>
                            <span className="duel-driver">
                              <strong>{p.driver}</strong>
                              <small>
                                {p.team}
                                {record?.laps[p.driver]
                                  ? ` · ${formatLap(record.laps[p.driver])}`
                                  : ''}
                              </small>
                            </span>
                            {won && (
                              <span className="duel-result" title="Advances">
                                <span aria-hidden="true">✓</span>
                                <span className="sr-only">Advances</span>
                              </span>
                            )}
                            {out && <span className="duel-result">Out</span>}
                          </div>
                        );
                      })}
                      {!m.ready && <p className="duel-wait">Awaiting previous match</p>}
                      {m.ready && !m.players.length && (
                        <p className="duel-wait">Empty bracket slot</p>
                      )}
                      {m.ready && m.players.length === 2 && !m.winner && !onWinner && (
                        <p className="duel-wait">Result pending</p>
                      )}
                      {onWinner && m.ready && m.players.length === 2 && (
                        <label>
                          Winner
                          <select
                            aria-label={`${m.id} winner`}
                            value={record?.winners[m.id] || ''}
                            onChange={(e) => onWinner(m.id, e.target.value)}
                          >
                            <option value="">Not decided</option>
                            {m.players.map((p) => (
                              <option key={p.driver}>{p.driver}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        <section className="duel-column duel-column-winner" aria-label="Duel winner">
          <h3 className="duel-stage">Duel winner</h3>
          <div className={`duel-champion${champion ? '' : ' is-pending'}`}>
            {champion ? (
              <>
                <p className="eyebrow">
                  <span aria-hidden="true">🏆</span> DUEL WINNER
                </p>
                <p className="duel-champion-name">{champion.driver}</p>
                <p className="muted">
                  {champion.team} · qualified P{seed(champion.driver)}
                </p>
              </>
            ) : (
              <p className="muted">Decided in the Final.</p>
            )}
            {fastest && (
              <p className="duel-fastest">
                <span className="eyebrow">FASTEST DUEL LAP</span>
                <strong>{formatLap(fastest[1])}</strong> {fastest[0]}
              </p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
export function DuelEditor({
  league,
  initialRound,
}: {
  league: League;
  initialRound: number;
}) {
  const [round, setRound] = useState(initialRound),
    [draft, setDraft] = useState<DuelRecord | null>(null),
    [laps, setLaps] = useState<Record<string, string>>({}),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<DuelRecord | null>(null),
    [message, setMessage] = useState(''),
    [baseline, setBaseline] = useState<{
      id: string | null;
      body: string | null;
    }>({ id: null, body: null });
  const seeds = duelSeeds(league.data, round);
  function load() {
    const existing = league.data.find(
      (e) => e.kind === 'duel' && roundNumber(e.title) === round,
    );
    const saved = publishedDuel(league.data, round);
    setBaseline({ id: existing?.id || null, body: existing?.body || null });
    setDraft(
      saved || {
        round,
        qualifyingBody: qualifyingFor(league.data, round)?.body || '',
        winners: {},
        laps: {},
      },
    );
    setLaps(
      Object.fromEntries(
        Object.entries(saved?.laps || {}).map(([n, t]) => [n, formatLap(t)]),
      ),
    );
    setDirty(false);
    setMessage('');
  }
  function winner(id: MatchId, driver: string) {
    if (!draft) return;
    const winners = { ...draft.winners };
    if (driver) winners[id] = driver;
    else delete winners[id];
    // Changing an upstream result invalidates dependent selections.
    if (id.startsWith('QF')) {
      delete winners[id === 'QF1' || id === 'QF2' ? 'SF1' : 'SF2'];
      delete winners.FINAL;
    }
    if (id.startsWith('SF')) delete winners.FINAL;
    setDraft({ ...draft, winners });
    setDirty(true);
  }
  function prepare() {
    try {
      if (!draft) return;
      const next = {
        ...draft,
        laps: Object.fromEntries(
          Object.entries(laps)
            .filter(([, t]) => t.trim())
            .map(([n, t]) => [n, parseLap(t)]),
        ),
      };
      validateDuel(next, league.data, round);
      setPreview(next);
      setMessage('');
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function publish() {
    if (!preview || busy) return;
    setBusy(true);
    try {
      const body = JSON.stringify(preview);
      const r = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'duel',
          title: roundTitle(round),
          body,
          replace: true,
          expectedId: baseline.id,
          expectedBody: baseline.body,
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error || 'Unable to publish Duel.');
      setBaseline({ id: baseline.id || `result-duel-${round}`, body });
      setDraft(preview);
      setDirty(false);
      setPreview(null);
      await league.refresh();
      setMessage('Duel published successfully.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div data-admin-dirty={dirty}>
      <section className="panel">
        <label>
          Select round
          <select
            value={round}
            disabled={dirty || busy}
            onChange={(e) => {
              setRound(Number(e.target.value));
              setDraft(null);
              setMessage('');
            }}
          >
            {schedule.map((r) => (
              <option value={r.round} key={r.round}>
                R{r.round} · {r.country}
              </option>
            ))}
          </select>
        </label>
        <button
          className="outline"
          disabled={busy || seeds.length < 2}
          onClick={load}
        >
          {draft ? 'Reset unsaved changes' : 'Open Duel editor'}
        </button>
        <p className="muted">
          Qualifying → Duel → Race. Winners are restricted to each match.
          Changing a winner clears dependent results. Recorded laps are each
          driver’s best duel lap; the fastest is calculated automatically.
        </p>
      </section>
      <fieldset disabled={busy}>
        <DuelView
          data={league.data}
          round={round}
          draft={draft || undefined}
          onWinner={draft ? winner : undefined}
        />
        {draft && seeds.length >= 2 && (
          <section className="panel">
            <h3>Best duel laps</h3>
            <div className="duel-laps">
              {seeds.map((p) => (
                <label key={p.driver}>
                  {p.driver}
                  <input
                    aria-label={`Duel lap ${p.driver}`}
                    placeholder="0:52.751 (optional)"
                    value={laps[p.driver] || ''}
                    onChange={(e) => {
                      setLaps({ ...laps, [p.driver]: e.target.value });
                      setDirty(true);
                    }}
                  />
                </label>
              ))}
            </div>
            <button
              className="primary"
              disabled={!dirty || busy}
              onClick={prepare}
            >
              Preview Duel
            </button>
          </section>
        )}
      </fieldset>
      <output>{message}</output>
      <Dialog
        open={!!preview}
        onOpenChange={(open) => !open && !busy && setPreview(null)}
      >
        <DialogContent className="duel-preview">
          <DialogTitle>Preview Duel · {roundTitle(round)}</DialogTitle>
          <DialogDescription>
            {baseline.id
              ? 'This replaces the published Duel. Review every winner before confirming.'
              : 'Review the bracket before publishing. This does not change the official race classification or points.'}
          </DialogDescription>
          {preview && (() => {
            const bracket = duelBracket(seeds, preview.winners);
            const lap = duelFastest(preview);
            return (
              <div className="impact">
                <p className="eyebrow">WHAT CHANGES</p>
                <ul>
                  <li>
                    {bracket.filter((m) => m.winner && !m.bye).length} of{' '}
                    {bracket.filter((m) => !m.bye && (m.players.length === 2 || !m.ready)).length}{' '}
                    matches decided
                  </li>
                  <li>
                    Duel winner:{' '}
                    <strong>{bracket[6].winner?.driver ?? 'not decided yet'}</strong>
                  </li>
                  <li>
                    Fastest Duel lap:{' '}
                    {lap ? `${lap[0]} · ${formatLap(lap[1])}` : 'not recorded'}
                  </li>
                  <li>Race classification and championship points are not changed.</li>
                </ul>
              </div>
            );
          })()}
          {preview && (
            <DuelView data={league.data} round={round} draft={preview} />
          )}
          <p role="alert">{message}</p>
          <div className="formactions">
            <button className="outline" disabled={busy} onClick={() => setPreview(null)}>
              Keep editing
            </button>
            <button className="primary" disabled={busy} onClick={publish}>
              {busy ? 'Publishing…' : baseline.id ? 'Replace published Duel' : 'Publish Duel'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
