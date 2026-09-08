'use client';
import { useState, useEffect } from 'react';
import { validateClassification } from './validation';
import { classification } from './racing';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { parseLap, formatLap } from './result-utils';
import { Plus, ArrowUp, ArrowDown, Trash2, Save } from 'lucide-react';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from '@/components/ui/combobox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  schedule,
  roundNumber,
  roundTitle,
  canonical,
  teamFor,
  roster,
} from './season';
import type { League } from './league';
type Draft = {
  driver: string;
  team: string;
  points: string;
  time: string;
  attempts: string;
  duel: string;
};
const blank = (): Draft => ({
  driver: '',
  team: '',
  points: '0',
  time: '',
  attempts: '1',
  duel: '',
});
const names = roster.map((r) => r.driver);
export function ResultEditor({
  league,
  sessionKind,
  initialRound = 6,
}: {
  league: League;
  sessionKind?: 'race' | 'qualifying';
  initialRound?: number;
}) {
  const [preview, setPreview] = useState(false),
    [round, setRound] = useState(initialRound),
    [kind, setKind] = useState(sessionKind || 'race'),
    [rows, setRows] = useState<Draft[]>([blank()]),
    [loaded, setLoaded] = useState(false),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [baseline, setBaseline] = useState<{
      id: string | null;
      body: string | null;
    }>({ id: null, body: null });
  const draftKey = `rls1-draft-${kind}-${round}`;
  useEffect(() => {
    if (loaded && dirty) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(rows));
      } catch {}
    }
  }, [rows, dirty, loaded, draftKey]);
  function recover() {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) {
        setMessage('No saved draft for this round.');
        return;
      }
      const draft = JSON.parse(raw);
      if (!Array.isArray(draft) || !draft.length) throw Error();
      load();
      setRows(draft.map((r) => ({ ...blank(), ...r })));
      setDirty(true);
      setMessage('Draft restored. Review before saving.');
    } catch {
      setMessage('Could not restore this draft.');
    }
  }
  const existing = league.data.find(
    (e) => e.kind === kind && roundNumber(e.title) === round,
  );
  function load() {
    const entry = league.data.find(
      (e) => e.kind === kind && roundNumber(e.title) === round,
    );
    setRows(
      entry
        ? classification(entry).map((r) => ({
            driver: r.driver,
            team: r.team,
            points: String(r.points ?? 0),
            time: r.ms
              ? `${Math.floor(r.ms / 60000)}:${((r.ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`
              : '',
            attempts: String(r.attempts ?? 1),
            duel: r.duelMs ? formatLap(r.duelMs) : '',
          }))
        : [blank()],
    );
    setBaseline(
      entry && !entry.id.startsWith('archive-')
        ? { id: entry.id, body: entry.body }
        : { id: null, body: null },
    );
    setLoaded(true);
    setDirty(false);
    setMessage('');
  }
  function update(i: number, patch: Partial<Draft>) {
    setRows(rows.map((r, j) => (i === j ? { ...r, ...patch } : r)));
    setDirty(true);
    setMessage('');
  }
  function move(i: number, d: number) {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setRows(next);
    setDirty(true);
  }
  function rowErrors(r: Draft, index: number) {
    if (!dirty) return '';
    const errors: string[] = [];
    if (!r.driver.trim()) errors.push('Choose a driver.');
    if (
      r.driver.trim() &&
      rows.some(
        (other, i) =>
          i !== index &&
          canonical(other.driver).toLowerCase() ===
            canonical(r.driver).toLowerCase(),
      )
    )
      errors.push('Driver is duplicated.');
    if (!r.team.trim()) errors.push('Enter a team.');
    if (kind === 'qualifying') {
      try {
        parseLap(r.time);
      } catch {
        errors.push('Lap must be a valid time, e.g. 0:52.751.');
      }
      if (
        !Number.isInteger(Number(r.attempts)) ||
        Number(r.attempts) < 1 ||
        Number(r.attempts) > 3
      )
        errors.push('Attempts must be 1, 2 or 3.');
    } else {
      if (
        !r.points.trim() ||
        !Number.isFinite(Number(r.points)) ||
        Number(r.points) < 0
      )
        errors.push('Points must be zero or higher.');
      if (r.duel.trim()) {
        try {
          parseLap(r.duel);
        } catch {
          errors.push('Best duel lap must be a valid time.');
        }
      }
    }
    return errors.join(' ');
  }
  function validated() {
    const data = rows.map((r) => {
      if (!r.driver.trim() || !r.team.trim())
        throw Error('Every row needs a driver and team.');
      if (kind === 'race') {
        const points = Number(r.points);
        if (!r.points.trim() || !Number.isFinite(points) || points < 0)
          throw Error('Enter valid points for every driver.');
        return {
          driver: r.driver.trim(),
          team: r.team.trim(),
          points,
          ...(r.duel.trim() ? { duelMs: parseLap(r.duel) } : {}),
        };
      }
      const ms = parseLap(r.time);
      const attempts = Number(r.attempts);
      if (!Number.isInteger(attempts) || attempts < 1 || attempts > 3)
        throw Error('Attempts must be 1, 2 or 3.');
      return { driver: r.driver.trim(), team: r.team.trim(), ms, attempts };
    });
    if (
      new Set(data.map((r) => canonical(r.driver).toLowerCase())).size !==
      data.length
    )
      throw Error('Each driver may appear only once.');
    validateClassification(kind, data);
    return data;
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const data = validated();
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind,
          title: roundTitle(round),
          body: JSON.stringify(data),
          replace: true,
          expectedId: baseline.id,
          expectedBody: baseline.body,
        }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw Error(result.error || 'Save failed');
      await league.refresh();
      setBaseline({
        id: baseline.id || `result-${kind}-${round}`,
        body: JSON.stringify(data),
      });
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      setDirty(false);
      setPreview(false);
      setMessage('Saved. Results and championship standings are updated.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section data-admin-dirty={dirty} className="panel result-editor">
      <p className="eyebrow">RESULT MANAGER</p>
      <h3>Add or update a classification</h3>
      <p className="muted">
        Choose a round, open the classification, then save your changes.
        Qualifying appears on the Results page as soon as it is published.
      </p>
      <div className="formactions">
        <Select
          value={round}
          onValueChange={(v) => {
            setRound(Number(v));
            setLoaded(false);
          }}
          disabled={dirty}
        >
          <SelectTrigger aria-label="Result round">
            <SelectValue>
              R{round} · {schedule[round - 1].country}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {schedule.map((r) => (
              <SelectItem key={r.round} value={r.round}>
                R{r.round} · {r.country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!sessionKind && (
          <Select
            value={kind}
            onValueChange={(v) => {
              setKind(v === 'qualifying' ? 'qualifying' : 'race');
              setLoaded(false);
            }}
            disabled={dirty}
          >
            <SelectTrigger aria-label="Result session">
              <SelectValue>
                {kind === 'race' ? 'Race results' : 'Qualifying'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="race">Race results</SelectItem>
              <SelectItem value="qualifying">Qualifying</SelectItem>
            </SelectContent>
          </Select>
        )}
        <button className="outline" disabled={busy || dirty} onClick={recover}>
          Restore browser draft
        </button>
        {!loaded && (
          <button className="primary" onClick={load}>
            {existing ? 'Edit existing results' : 'Add results'}
          </button>
        )}
      </div>
      {loaded && (
        <fieldset disabled={busy}>
          <p className="footnote">
            {kind === 'race'
              ? 'Rows are finishing order. Points are explicit: include any fastest-lap bonus or penalty. Enter each driver’s best duel lap if known. The fastest is highlighted publicly. Points must already include bonuses; no extra point is added automatically.'
              : 'Qualifying sorts automatically by lap time. Enter all classified drivers and their attempts.'}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  'POS',
                  'DRIVER',
                  'TEAM',
                  kind === 'race' ? 'POINTS' : 'LAP',
                  kind === 'race' ? 'BEST DUEL LAP' : 'ATTEMPTS',
                  ...(kind === 'race' ? ['ORDER'] : []),
                  '',
                ].map((x, i) => (
                  <TableHead key={i}>{x}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Combobox
                      items={names}
                      inputValue={r.driver}
                      value={r.driver}
                      onInputValueChange={(driver) =>
                        update(i, {
                          driver,
                          ...(roster.some(
                            (r) => canonical(r.driver) === canonical(driver),
                          )
                            ? { team: teamFor(canonical(driver), round) }
                            : {}),
                        })
                      }
                      onValueChange={(v) => {
                        if (v)
                          update(i, {
                            driver: String(v),
                            team: teamFor(String(v), round),
                          });
                      }}
                    >
                      <ComboboxInput
                        aria-label={`Driver ${i + 1}`}
                        aria-describedby={
                          rowErrors(r, i) ? `row-error-${i}` : undefined
                        }
                        placeholder="Choose or type driver"
                      />
                      <ComboboxContent>
                        <ComboboxList>
                          {(name: string) => (
                            <ComboboxItem value={name} key={name}>
                              {name}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    {rowErrors(r, i) && (
                      <p className="row-errors" id={`row-error-${i}`}>
                        {rowErrors(r, i)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <input
                      aria-label={`Team ${i + 1}`}
                      value={r.team}
                      onChange={(e) => update(i, { team: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      aria-label={
                        kind === 'race' ? `Points ${i + 1}` : `Lap ${i + 1}`
                      }
                      type={kind === 'race' ? 'number' : 'text'}
                      min="0"
                      step="any"
                      value={kind === 'race' ? r.points : r.time}
                      onChange={(e) =>
                        update(
                          i,
                          kind === 'race'
                            ? { points: e.target.value }
                            : { time: e.target.value },
                        )
                      }
                    />
                  </TableCell>
                  {kind === 'race' && (
                    <TableCell>
                      <input
                        aria-label={`Best duel lap ${i + 1}`}
                        placeholder="0:52.751"
                        value={r.duel}
                        onChange={(e) => update(i, { duel: e.target.value })}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {kind === 'race' ? (
                      <div className="formactions">
                        <button
                          className="outline"
                          aria-label={`Move driver ${i + 1} up`}
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="outline"
                          aria-label={`Move driver ${i + 1} down`}
                          disabled={i === rows.length - 1}
                          onClick={() => move(i, 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    ) : (
                      <input
                        aria-label={`Attempts ${i + 1}`}
                        type="number"
                        min="1"
                        max="3"
                        value={r.attempts}
                        onChange={(e) =>
                          update(i, { attempts: e.target.value })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      className="outline"
                      aria-label={`Remove driver ${i + 1}`}
                      disabled={rows.length === 1}
                      onClick={() => {
                        setRows(rows.filter((_, j) => i !== j));
                        setDirty(true);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="formactions editor-savebar">
            <button
              className="outline"
              onClick={() => {
                setRows([...rows, blank()]);
                setDirty(true);
              }}
            >
              <Plus size={16} />
              Add driver
            </button>
            <button
              className="primary"
              disabled={busy || !dirty}
              onClick={() => {
                try {
                  validated();
                  setMessage('');
                  setPreview(true);
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              <Save size={16} />
              {busy ? 'Saving…' : 'Preview results'}
            </button>
            <button
              className="outline"
              disabled={busy}
              onClick={() => {
                try {
                  localStorage.removeItem(draftKey);
                } catch {}
                load();
              }}
            >
              Reset unsaved changes
            </button>
            {kind === 'race' && (
              <span className="muted">
                {rows.length} drivers ·{' '}
                {rows.reduce((s, r) => s + (Number(r.points) || 0), 0)} points
                awarded
              </span>
            )}
          </div>
          {dirty && (
            <p className="footnote">
              Unsaved changes are backed up in this browser. Save or reset
              before switching rounds.
            </p>
          )}
        </fieldset>
      )}
      <p aria-live="polite" className="formstatus">
        {message}
      </p>
      <Dialog open={preview} onOpenChange={(v) => !busy && setPreview(v)}>
        <DialogContent className="composer">
          <DialogTitle>
            Review {kind === 'race' ? 'race results' : 'qualifying'}
          </DialogTitle>
          <DialogDescription>
            {existing &&
              (kind === 'race'
                ? 'This replaces the published race classification and updates championship standings. '
                : 'This replaces the published qualifying classification. ')}
            {roundTitle(round)} · Confirm the classification before it becomes
            public.
          </DialogDescription>
          <div className="preview-rows">
            {preview &&
              [...rows]
                .sort((a, b) =>
                  kind === 'qualifying'
                    ? parseLap(a.time) - parseLap(b.time)
                    : 0,
                )
                .map((r, i) => (
                  <p key={r.driver}>
                    <strong>
                      P{i + 1} {r.driver}
                    </strong>{' '}
                    · {r.team}
                    <br />
                    {kind === 'race'
                      ? `${r.points} pts${r.duel ? ' · Duel ' + r.duel : ''}`
                      : `${r.time} · ${r.attempts}/3 attempts`}
                  </p>
                ))}
          </div>
          {kind === 'race' && (
            <p className="muted">
              Published race points already include any bonuses and penalties.
            </p>
          )}
          <p aria-live="polite">{message}</p>
          <button className="primary" disabled={busy} onClick={save}>
            {busy
              ? 'Publishing…'
              : existing
                ? 'Replace result'
                : 'Confirm & publish'}
          </button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
