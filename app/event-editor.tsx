'use client';
import { useState } from 'react';
import { schedule, roundTitle, roundNumber } from './season';
import { events } from './racing';
import { validateOfficial, penaltyTypes } from './validation';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { League } from './league';
export function EventEditor({
  league,
  fixedMode,
  initialRound = 7,
}: {
  league: League;
  fixedMode?: 'event' | 'penalty';
  initialRound?: number;
}) {
  const [round, setRound] = useState(initialRound),
    [mode, setMode] = useState(fixedMode || 'event'),
    [preview, setPreview] = useState<{
      body: string;
      baseline: { id: string | null; body: string | null };
    } | null>(null),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [published, setPublished] = useState(false),
    [dirty, setDirty] = useState(false);
  const [baseline, setBaseline] = useState(() => {
    const e = league.data.find(
      (e) => e.kind === 'event' && roundNumber(e.title) === initialRound,
    );
    return { id: e?.id || null, body: e?.body || null };
  });
  const event = events(league.data)[round - 1];
  function prepare(form: HTMLFormElement) {
    try {
      const f = new FormData(form);
      const body = JSON.stringify(
        mode === 'event'
          ? {
              date: f.get('date'),
              startAt: f.get('time')
                ? new Date(
                    `${f.get('date') as string}T${f.get('time') as string}:00+08:00`,
                  ).toISOString()
                : null,
              status: f.get('status'),
              notes: f.get('notes'),
            }
          : {
              driver: f.get('driver'),
              type: f.get('type'),
              reason: f.get('reason'),
              penalty: f.get('penalty'),
              note: f.get('note'),
            },
      );
      validateOfficial(mode, roundTitle(round), body);
      setPreview({ body, baseline });
      setMessage('');
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function publish() {
    if (!preview || busy) return;
    setBusy(true);
    try {
      const r = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind: mode,
          title: roundTitle(round),
          body: preview.body,
          ...(mode === 'event'
            ? {
                replace: true,
                expectedId: preview.baseline.id,
                expectedBody: preview.baseline.body,
              }
            : {}),
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error);
      if (mode === 'event')
        setBaseline({
          id: baseline.id || `result-event-${round}`,
          body: preview.body,
        });
      setPreview(null);
      setPublished(true);
      setDirty(false);
      setMessage('Published successfully.');
      await league.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" data-admin-dirty={dirty}>
      <h3>
        {mode === 'event' ? 'Edit event information' : 'New steward decision'}
      </h3>
      <div className="formactions">
        <Select
          disabled={dirty || busy}
          value={round}
          onValueChange={(v) => {
            setPublished(false);
            setRound(Number(v));
            const e = league.data.find(
              (e) => e.kind === 'event' && roundNumber(e.title) === Number(v),
            );
            setBaseline({ id: e?.id || null, body: e?.body || null });
            setMessage('');
          }}
        >
          <SelectTrigger aria-label="Event editor round">
            <SelectValue>
              R{round} · {event.country}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {schedule.map((e) => (
              <SelectItem value={e.round} key={e.round}>
                R{e.round} · {e.country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!fixedMode && (
          <Select
            value={mode}
            onValueChange={(v) => {
              setPublished(false);
              setMode(v === 'penalty' ? 'penalty' : 'event');
              setMessage('');
            }}
          >
            <SelectTrigger aria-label="Event editor type">
              <SelectValue>
                {mode === 'event' ? 'Event information' : 'Steward decision'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="event">Event information</SelectItem>
              <SelectItem value="penalty">Steward decision</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <form
        key={`${round}-${mode}`}
        onReset={() => {
          setDirty(false);
          setPublished(false);
          setMessage('');
        }}
        onChange={() => {
          setPublished(false);
          setDirty(true);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          prepare(e.currentTarget);
        }}
      >
        {mode === 'event' ? (
          <>
            <div className="deadlinefields">
              <label>
                Event date
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={event.date}
                />
              </label>
              <label>
                Start time · Hong Kong (UTC+8)
                <input
                  name="time"
                  type="time"
                  defaultValue={
                    event.startAt
                      ? new Date(Date.parse(event.startAt) + 28800000)
                          .toISOString()
                          .slice(11, 16)
                      : ''
                  }
                />
              </label>
              <label>
                Status
                <select name="status" defaultValue={event.status || 'UPCOMING'}>
                  <option>UPCOMING</option>
                  <option>QUALIFYING</option>
                  <option>LIVE</option>
                </select>
              </label>
            </div>
            <p className="muted">
              Leave the start time empty if it is not confirmed. A published
              race result marks the event finished automatically.
            </p>
            <label>
              Event notes
              <textarea
                name="notes"
                maxLength={2000}
                defaultValue={event.notes || ''}
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Driver
              <input name="driver" required maxLength={100} />
            </label>
            <label>
              Decision type
              <select name="type">
                {penaltyTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <textarea name="reason" required maxLength={2000} />
            </label>
            <label>
              Penalty or decision
              <input
                name="penalty"
                required
                maxLength={2000}
                placeholder="Describe the official decision"
              />
            </label>
            <label>
              Steward note
              <textarea name="note" maxLength={2000} />
            </label>
            <p className="muted">
              This publishes a decision only. To change championship points,
              separately review and publish the corrected race classification.
            </p>
          </>
        )}
        <button type="reset" className="outline" disabled={busy || !dirty}>
          Reset unsaved changes
        </button>
        <button className="primary" disabled={busy || published || !dirty}>
          {published ? 'Published' : 'Preview before publishing'}
        </button>
      </form>
      <p aria-live="polite">{message}</p>
      <Dialog
        open={!!preview}
        onOpenChange={(v) => !busy && !v && setPreview(null)}
      >
        <DialogContent className="composer">
          <DialogTitle>
            Review {mode === 'event' ? 'event information' : 'steward decision'}
          </DialogTitle>
          <DialogDescription>
            {roundTitle(round)} · Publishing makes this visible to all drivers.
          </DialogDescription>
          {preview && (
            <dl className="preview-fields">
              {Object.entries(JSON.parse(preview.body)).map(([k, v]) => (
                <div key={k}>
                  <dt>
                    {
                      (
                        {
                          startAt: 'Start time (UTC)',
                          date: 'Date',
                          status: 'Status',
                          notes: 'Notes',
                          driver: 'Driver',
                          type: 'Type',
                          reason: 'Reason',
                          penalty: 'Decision',
                          note: 'Steward note',
                        } as Record<string, string>
                      )[k]
                    }
                  </dt>
                  <dd>
                    {typeof v === 'string'
                      ? v || 'Not announced'
                      : 'Not announced'}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <p aria-live="polite">{message}</p>
          <button className="primary" disabled={busy} onClick={publish}>
            {busy ? 'Publishing…' : 'Confirm & publish'}
          </button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
