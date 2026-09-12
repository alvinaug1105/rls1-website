'use client';
import { useState } from 'react';
import { PngExport } from './png-export';
import { drawDuelGraphic } from './result-png';
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
import { formatLap, parseLap } from './result-utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
      <section className="panel">
        <h3>Duel</h3>
        <p>Awaiting qualifying classification.</p>
        <p className="muted">
          At least two classified drivers are needed for a Duel.
        </p>
      </section>
    );
  const matches = duelBracket(seeds, record?.winners),
    champion = matches[6].winner,
    fastest = duelFastest(record);
  const stale =
    !draft &&
    !record &&
    data.some(
      (e) =>
        e.kind === 'duel' && e.approved === 1 && roundNumber(e.title) === round,
    );
  return (
    <section className="panel duel-panel">
      <h3>Duel</h3>
      <PngExport
        label="Save Duel PNG"
        filename={`RLS1-S1-R${round}-duel${draft ? '-draft' : ''}.png`}
        draw={(canvas) =>
          drawDuelGraphic(canvas, round, seeds, record, !!draft)
        }
      />
      <p className="muted">
        {stale
          ? 'Qualifying was updated. The organiser must review and republish this bracket.'
          : !record
            ? 'Bracket awaiting results.'
            : champion
              ? 'Duel complete.'
              : 'Duel in progress.'}{' '}
        {seeds.length < 8
          ? 'Empty qualifying slots are byes.'
          : 'Top 8 qualifying drivers.'}
      </p>
      <div className="duel-bracket">
        {(
          [
            ['Quarter-finals', matches.slice(0, 4)],
            ['Semi-finals', matches.slice(4, 6)],
            ['Final', matches.slice(6)],
          ] as [string, typeof matches][]
        ).map(([title, group]) => (
          <div className="duel-column" key={String(title)}>
            <h4>{String(title)}</h4>
            {(group as typeof matches).map((m) => (
              <article className="duel-match" key={m.id}>
                <p className="eyebrow">
                  {m.id}
                  {m.bye ? ' · BYE' : ''}
                </p>
                {m.players.map((p) => (
                  <div
                    className={
                      m.winner?.driver === p.driver ? 'duel-winner' : ''
                    }
                    key={p.driver}
                  >
                    <strong>
                      P{seeds.findIndex((s) => s.driver === p.driver) + 1} ·{' '}
                      {p.driver}
                    </strong>
                    <small>
                      {p.team}
                      {record?.laps[p.driver]
                        ? ` · ${formatLap(record.laps[p.driver])}`
                        : ''}
                    </small>
                  </div>
                ))}
                {!m.ready && <p className="muted">Awaiting previous match</p>}
                {m.ready && !m.players.length && (
                  <p className="muted">Empty bracket slot</p>
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
                {!onWinner && m.winner && <p>Advances: {m.winner.driver}</p>}
              </article>
            ))}
          </div>
        ))}
      </div>
      {champion && (
        <div className="duel-champion">
          <p className="eyebrow">DUEL WINNER</p>
          <h3>{champion.driver}</h3>
        </div>
      )}
      {fastest && (
        <p>
          <strong>FASTEST DUEL LAP</strong> · {fastest[0]} —{' '}
          {formatLap(fastest[1])}
        </p>
      )}
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
          {preview && (
            <DuelView data={league.data} round={round} draft={preview} />
          )}
          <p role="alert">{message}</p>
          <button className="primary" disabled={busy} onClick={publish}>
            {busy ? 'Publishing…' : 'Publish Duel'}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
