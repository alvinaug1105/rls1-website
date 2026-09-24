'use client';
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
// Legacy video records are JSON {url, notes}. Malformed records, or links that
// are not HTTPS, are skipped rather than breaking the page.
function video(body: string) {
  try {
    const v = JSON.parse(body) as { url?: unknown; notes?: unknown };
    return typeof v.url === 'string' && v.url.startsWith('https://')
      ? { url: v.url, notes: typeof v.notes === 'string' ? v.notes : '' }
      : null;
  } catch {
    return null;
  }
}
const posted = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Hong_Kong',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
export function Community({
  kind,
  league,
}: {
  kind: 'video' | 'story';
  league: League;
}) {
  const [open, setOpen] = useState(false);
  const posts = league.data.filter(
    (e) => e.kind === kind && e.approved === 1 && (kind === 'story' || video(e.body)),
  );
  return (
    <>
      <div className="viewheading sectionhead">
        <div>
          <p className="eyebrow">
            COMMUNITY · {kind === 'video' ? 'WATCH. LEARN. GO FASTER.' : 'FROM THE PEOPLE ON THE GRID'}
          </p>
          <h1 className="page-title">
            {kind === 'video' ? 'Track video library' : 'The driver paddock'}
          </h1>
          <p className="muted">
            {kind === 'video'
              ? 'Onboard laps, circuit guides and race highlights shared by the community.'
              : 'Race stories, setup notes and lessons from the grid.'}{' '}
            Community posts are reviewed by race control but are not official
            league communications.
          </p>
        </div>
        <button className="primary" onClick={() => setOpen(true)}>
          <Plus size={17} aria-hidden="true" />
          {kind === 'video' ? 'Share a video' : 'Write a story'}
        </button>
      </div>
      {!posts.length ? (
        <section className="panel empty">
          {kind === 'video' ? <Play aria-hidden="true" /> : <MessageSquare aria-hidden="true" />}
          <h2 className="section-title">
            {kind === 'video'
              ? 'Give the grid a better racing line.'
              : 'Every driver has a story.'}
          </h2>
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
          {posts.map((p) => {
            const v = kind === 'video' ? video(p.body) : null;
            return (
              <article className="panel post" key={p.id}>
                <p className="eyebrow">
                  {kind === 'video' ? 'TRACK VIDEO' : 'DRIVER STORY'} · COMMUNITY
                </p>
                <h2 className="card-title">{p.title}</h2>
                <p className="storybody">{v ? v.notes : p.body}</p>
                {v && (
                  <a
                    className="outline"
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Play size={16} aria-hidden="true" />
                    Watch video
                    <ArrowUpRight size={16} aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
                <p className="footnote">
                  {p.author} ·{' '}
                  <time dateTime={p.created}>
                    {Number.isFinite(Date.parse(p.created))
                      ? posted.format(Date.parse(p.created))
                      : ''}
                  </time>
                </p>
              </article>
            );
          })}
        </div>
      )}
      <Compose open={open} setOpen={setOpen} kind={kind} league={league} />
    </>
  );
}
// Guest submission form. Posts are always created as pending (the public
// scope never grants organiser rights) and appear after moderation.
function Compose({
  open,
  setOpen,
  kind,
  league,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  kind: 'video' | 'story';
  league: League;
}) {
  const [message, setMessage] = useState(''),
    [saving, setSaving] = useState(false),
    [submitted, setSubmitted] = useState(false);
  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      const f = new FormData(e.currentTarget);
      const notes = (f.get('body') as string) || '';
      const r = await fetch('/api/entries?public=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          title: f.get('title'),
          body: kind === 'video' ? JSON.stringify({ url: f.get('url'), notes }) : notes,
          author: f.get('author'),
          website: f.get('website'),
        }),
      });
      const d = (await r.json().catch(() => ({
        error: 'The server could not accept this request. Please retry shortly.',
      }))) as { error: string };
      if (!r.ok) throw Error(d.error);
      setSubmitted(true);
      setMessage(
        'Submitted for review. Your post becomes public after race control approves it.',
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
          {kind === 'video' ? 'Share a track video' : 'Share your driving experience'}
        </DialogTitle>
        <DialogDescription>
          No account needed. Your display name is unverified; race control
          reviews every guest post before publication.
        </DialogDescription>
        <form onSubmit={submit}>
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
          <label>
            Title
            <input name="title" required maxLength={150} placeholder="Give your post a title" />
          </label>
          {kind === 'video' && (
            <label>
              Video link (HTTPS)
              <input
                name="url"
                required
                type="url"
                pattern="https://.*"
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </label>
          )}
          <label>
            {kind === 'video' ? 'Notes' : 'Your story'}
            <textarea
              name="body"
              required={kind !== 'video'}
              minLength={kind === 'story' ? 10 : undefined}
              maxLength={40000}
              rows={7}
              placeholder="Write here…"
            />
          </label>
          <p aria-live="polite" className="formstatus">
            {message}
          </p>
          <div className="formactions">
            <button className="primary" disabled={saving || submitted}>
              {submitted ? 'Submitted' : saving ? 'Submitting…' : 'Submit for review'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
