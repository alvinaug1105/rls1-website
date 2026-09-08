'use client';
import { Deadline } from './deadline';
import { useState, useEffect, useCallback, useRef } from 'react';
import { archive, mergeArchive } from './season';
import { Plus, Play, MessageSquare, ArrowUpRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export type Entry = {
  id: string;
  kind: string;
  title: string;
  body: string;
  author: string;
  approved: number;
  created: string;
};
export type Row = {
  driver: string;
  team: string;
  attempts: number;
  ms: number;
  points: number;
  duelMs?: number;
};
export const lap = (ms: number) =>
  `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`;
export function useLeague(scope: 'public' | 'admin' = 'public') {
  const [data, setData] = useState<Entry[]>(archive),
    [error, setError] = useState(''),
    [isAdmin, setAdmin] = useState(false),
    [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const r = await fetch(`/api/entries?${scope}=1`, { cache: 'no-store' });
      const d = (await r.json()) as {
        error?: string;
        data: Entry[];
        isAdmin: boolean;
      };
      if (r.status === 401 && scope === 'admin') {
        window.location.replace('/admin?expired=1');
        return;
      }
      if (!r.ok) throw Error(d.error || 'Unable to load league updates.');
      if (version !== requestVersion.current) return;
      setData(mergeArchive(d.data));
      setAdmin(d.isAdmin);
      setError('');
    } catch (e) {
      if (version === requestVersion.current) setError((e as Error).message);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [scope]);
  useEffect(() => {
    const generation = requestVersion;
    queueMicrotask(() => {
      void refresh();
    });
    return () => {
      generation.current++;
    };
  }, [refresh]);
  return { data, error, isAdmin, refresh, loading };
}
export type League = ReturnType<typeof useLeague>;
export function Community({
  kind,
  league,
}: {
  kind: 'video' | 'story';
  league: League;
}) {
  const [open, setOpen] = useState(false);
  const posts = league.data.filter((e) => e.kind === kind && e.approved === 1);
  return (
    <>
      <div className="viewheading sectionhead">
        <div>
          <p className="eyebrow">
            {kind === 'video'
              ? 'WATCH. LEARN. GO FASTER.'
              : 'FROM THE PEOPLE ON THE GRID'}
          </p>
          <h2>
            {kind === 'video' ? 'Track video library' : 'The driver paddock'}
          </h2>
          <p className="muted">
            {kind === 'video'
              ? 'Onboard laps, circuit guides and race highlights.'
              : 'Race stories, setup notes and the lessons you take into the next round.'}
          </p>
        </div>
        <button className="primary" onClick={() => setOpen(true)}>
          <Plus size={17} />
          {kind === 'video' ? 'Share a video' : 'Write a story'}
        </button>
      </div>
      {!posts.length ? (
        <section className="panel empty">
          {kind === 'video' ? <Play /> : <MessageSquare />}
          <h3>
            {kind === 'video'
              ? 'Give the grid a better racing line.'
              : 'Every driver has a story.'}
          </h3>
          <p>
            {kind === 'video'
              ? 'Share a video link with the circuit name and a few useful notes.'
              : 'Tell us about your best overtake, a difficult race or a breakthrough in practice.'}
          </p>
          <span className="badge">
            Guest submissions are reviewed by race control
          </span>
        </section>
      ) : (
        <div className="postgrid">
          {posts.map((p) => (
            <article className="panel" key={p.id}>
              <p className="eyebrow">
                {kind === 'video' ? 'TRACK VIDEO' : 'DRIVER STORY'}
              </p>
              <h3>{p.title}</h3>
              <p className="storybody">
                {kind === 'video' ? JSON.parse(p.body).notes : p.body}
              </p>
              {kind === 'video' && (
                <a
                  className="outline"
                  href={JSON.parse(p.body).url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Play size={16} />
                  Watch video
                  <ArrowUpRight size={16} />
                </a>
              )}
              <p className="footnote">
                {p.author} · {new Date(p.created).toLocaleDateString()}
              </p>
            </article>
          ))}
        </div>
      )}
      <Compose open={open} setOpen={setOpen} kind={kind} league={league} />
    </>
  );
}
export function Compose({
  open,
  setOpen,
  kind,
  league,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  kind: string;
  league: League;
}) {
  const [message, setMessage] = useState(''),
    [saving, setSaving] = useState(false),
    [submitted, setSubmitted] = useState(false);
  const isResult = kind === 'race' || kind === 'qualifying';
  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      const f = new FormData(e.currentTarget);
      let body = (f.get('body') as string) || '';
      if (kind === 'video')
        body = JSON.stringify({ url: f.get('url'), notes: body });
      if (isResult) {
        const rows = body
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [driver, team, value, attempts] = line
              .split(',')
              .map((s) => s.trim());
            if (!driver || !team || !value)
              throw Error(
                'Each line needs a driver, team and ' +
                  (kind === 'race' ? 'points.' : 'lap time.'),
              );
            if (kind === 'race') {
              const points = Number(value);
              if (!Number.isFinite(points) || points < 0)
                throw Error('Points must be zero or more.');
              return { driver, team, points };
            }
            const m = value.match(/^(\d+):([0-5]\d)[.:](\d{3})$/);
            if (!m) throw Error('Use lap times such as 0:52.751.');
            const count = Number(attempts);
            if (!Number.isInteger(count) || count < 1 || count > 3)
              throw Error('Attempts must be 1, 2 or 3.');
            return {
              driver,
              team,
              ms: Number(m[1]) * 60000 + Number(m[2]) * 1000 + Number(m[3]),
              attempts: count,
            };
          });
        if (
          new Set(rows.map((r) => r.driver.toLowerCase())).size !== rows.length
        )
          throw Error('Each driver can only appear once per result.');
        body = JSON.stringify(rows);
      }
      const r = await fetch(
        `/api/entries${league.isAdmin ? '' : '?public=1'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kind,
            title: f.get('title'),
            body,
            author: f.get('author'),
            website: f.get('website'),
          }),
        },
      );
      const d = (await r.json().catch(() => ({
        error:
          'The server could not accept this request. Please retry shortly.',
      }))) as { error: string };
      if (!r.ok) throw Error(d.error);
      setSubmitted(true);
      setMessage(
        league.isAdmin
          ? 'Published to the league.'
          : 'Submitted for review. Your post becomes public after race control approves it.',
      );
      await league.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        setMessage('');
        setSubmitted(false);
      }}
    >
      <DialogContent className="composer">
        <DialogTitle>
          {kind === 'qualifying'
            ? 'Publish qualifying'
            : kind === 'race'
              ? 'Publish race results'
              : kind === 'notice'
                ? 'Post a race-control notice'
                : kind === 'video'
                  ? 'Share a track video'
                  : 'Share your driving experience'}
        </DialogTitle>
        <DialogDescription>
          {isResult
            ? 'Use the same round title for qualifying and race results. Points are entered explicitly, including bonuses and penalties.'
            : league.isAdmin
              ? 'Your post will appear immediately.'
              : 'No account needed. Your display name is unverified; race control reviews every guest post before publication.'}
        </DialogDescription>
        <form onSubmit={submit}>
          {!league.isAdmin && (
            <>
              <label>
                Your display name
                <input
                  name="author"
                  required
                  minLength={2}
                  maxLength={50}
                  placeholder="Your racing or Discord name"
                />
              </label>
              <div className="spamfield" aria-hidden="true">
                <label>
                  Leave blank
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
            </>
          )}
          <label>
            {isResult ? 'Round title' : 'Title'}
            <input
              name="title"
              required
              maxLength={150}
              placeholder={
                isResult
                  ? 'Season 1 — Round 6: Monaco'
                  : 'Give your post a title'
              }
            />
          </label>
          {kind === 'video' && (
            <label>
              Video link
              <input
                name="url"
                required
                type="url"
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </label>
          )}
          <label>
            {isResult
              ? kind === 'race'
                ? 'One driver per line: Driver, Team, Points'
                : 'One driver per line: Driver, Team, Lap time, Attempts'
              : 'Your notes'}
            <textarea
              name="body"
              required={kind !== 'video'}
              maxLength={40000}
              rows={7}
              placeholder={
                kind === 'qualifying'
                  ? 'Winter, WINter Racing, 0:52.751, 3'
                  : kind === 'race'
                    ? 'Winter, WINter Racing, 26'
                    : 'Write here…'
              }
            />
          </label>
          {isResult && (
            <p className="muted">
              Race rows stay in finishing order. Qualifying is sorted by time.
              Delete an old classification before publishing a correction.
            </p>
          )}
          <p aria-live="polite" className="formstatus">
            {message}
          </p>
          <div className="formactions">
            <button className="primary" disabled={saving || submitted}>
              {submitted
                ? 'Submitted'
                : saving
                  ? 'Saving…'
                  : league.isAdmin
                    ? 'Publish'
                    : 'Submit for review'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function Control({ league }: { league: League }) {
  const notices = league.data.filter(
    (e) => e.kind === 'notice' && e.approved === 1,
  );
  return (
    <>
      <div className="viewheading">
        <p className="eyebrow">FROM THE STEWARDS’ DESK</p>
        <h2>Race control</h2>
      </div>
      <div className="lowergrid">
        <section className="panel">
          <h3>Noticeboard</h3>
          {notices.length ? (
            notices.map((n) => (
              <article key={n.id} className="notice">
                <h3>{n.title}</h3>
                <p className="storybody">{n.body}</p>
              </article>
            ))
          ) : (
            <p className="muted">
              No official announcements yet. Round deadlines, duel matchups and
              steward decisions will be posted here.
            </p>
          )}
        </section>
        <section className="panel">
          <p className="eyebrow">LEAGUE QUICK GUIDE</p>
          <h3>Before you take to the grid</h3>
          <ul className="guide">
            <li>Up to three qualifying attempts.</li>
            <li>Submit improved times within 30 minutes.</li>
            <li>Include the required screenshots and random flag.</li>
            <li>Agree your duel time with your opponent.</li>
            <li>Both drivers must agree on the duel result.</li>
          </ul>
          <p className="footnote">
            Qualifying essentials. Official submissions remain in Discord’s
            submission-rls1 channel; check race control for the current
            deadline.
          </p>
        </section>
      </div>
      <section className="panel">
        <p className="eyebrow">DISCORD HELPER</p>
        <h3>Make a local-time deadline</h3>
        <Deadline />
      </section>
    </>
  );
}
