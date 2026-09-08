'use client';
import { useState } from 'react';
import type { League, Entry } from './league';
import { roundNumber } from './season';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export function PublishingDesk({
  league,
  mode,
}: {
  league: League;
  mode: 'publishing' | 'submissions' | 'stewarding';
}) {
  const [filter, setFilter] = useState(0),
    [search, setSearch] = useState(''),
    [selected, setSelected] = useState<Entry | null>(null),
    [action, setAction] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [notice, setNotice] = useState<{ title: string; body: string } | null>(
      null,
    ),
    [dirty, setDirty] = useState(false),
    [revision, setRevision] = useState(0);
  const posts = league.data
    .filter((e) =>
      mode === 'submissions'
        ? ['story', 'video'].includes(e.kind) && e.approved === filter
        : mode === 'stewarding'
          ? e.kind === 'penalty'
          : ['notice', 'race', 'qualifying'].includes(e.kind) &&
            e.approved === 1,
    )
    .filter((e) =>
      `${e.title} ${e.author}`.toLowerCase().includes(search.toLowerCase()),
    );
  async function submit() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/api/entries', {
        method: notice ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          notice ? { kind: 'notice', ...notice } : { id: selected?.id, action },
        ),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error || 'Unable to save.');
      if (notice) setRevision((v) => v + 1);
      setSelected(null);
      setNotice(null);
      setDirty(false);
      setMessage('Update saved successfully.');
      await league.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function content(e: Entry) {
    if (e.kind === 'video') {
      try {
        const v = JSON.parse(e.body);
        const url =
          typeof v.url === 'string' && v.url.startsWith('https://')
            ? v.url
            : '';
        return (
          <>
            <p className="storybody">{String(v.notes || '')}</p>
            {url && (
              <a
                className="outline"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open video ↗
              </a>
            )}
          </>
        );
      } catch {
        return <p>Video details unavailable.</p>;
      }
    }
    if (e.kind === 'penalty') {
      try {
        return (
          <dl>
            {Object.entries(JSON.parse(e.body)).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{typeof v === 'string' ? v : '—'}</dd>
              </div>
            ))}
          </dl>
        );
      } catch {
        return <p>Decision details unavailable.</p>;
      }
    }
    return <p className="storybody">{e.body}</p>;
  }
  return (
    <section className="panel" data-admin-dirty={dirty}>
      <h2>
        {mode === 'submissions'
          ? 'Review guest posts'
          : mode === 'stewarding'
            ? 'Published decisions'
            : 'Publication review'}
      </h2>
      <p className="muted">
        {mode === 'publishing'
          ? 'Review published classifications or prepare an announcement. Classification drafts and final previews are in their dedicated modules.'
          : mode === 'submissions'
            ? 'Preview each post before approving or rejecting it. Only approved content is public.'
            : 'Decisions do not change points. Update the official classification separately if required.'}
      </p>
      {mode === 'submissions' && (
        <div className="admin-tabs">
          {[
            [0, 'Pending'],
            [1, 'Approved'],
            [-1, 'Rejected'],
          ].map(([value, label]) => (
            <button
              className="outline"
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(Number(value))}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <label>
        Search posts
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Title or author"
        />
      </label>
      <output>{message}</output>
      <div className="admin-post-list">
        {!posts.length && <p className="muted">No matching posts.</p>}
        {posts.map((e) => (
          <article className="review desk-post" key={e.id}>
            <div>
              <p className="eyebrow">
                {e.kind} ·{' '}
                {e.approved === 1
                  ? 'Published'
                  : e.approved === 0
                    ? 'Pending'
                    : 'Rejected'}
              </p>
              <h3>{e.title}</h3>
              <p className="footnote">{e.author}</p>
            </div>
            <div className="formactions">
              {['race', 'qualifying'].includes(e.kind) ? (
                <>
                  <a
                    className="outline"
                    href={`/#round-${e.title.match(/Round (\d+)/i)?.[1] || ''}`}
                  >
                    View public result
                  </a>
                  <a
                    className="outline"
                    href={`/admin/${e.kind === 'race' ? 'results' : 'qualifying'}?round=${roundNumber(e.title)}`}
                  >
                    Review / edit
                  </a>
                </>
              ) : (
                <>
                  <button
                    className="outline"
                    onClick={() => {
                      setSelected(e);
                      setAction('');
                    }}
                  >
                    Preview
                  </button>
                  {!e.id.startsWith('archive-') && (
                    <button
                      className="outline"
                      onClick={() => {
                        setSelected(e);
                        setAction('delete');
                      }}
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {mode === 'publishing' && (
        <Announcement key={revision} onPreview={setNotice} onDirty={setDirty} />
      )}
      <Dialog
        open={!!selected || !!notice}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setSelected(null);
            setNotice(null);
          }
        }}
      >
        <DialogContent className="composer">
          <DialogTitle>
            {notice
              ? 'Preview announcement'
              : action === 'delete'
                ? 'Delete this post permanently?'
                : action === 'reject'
                  ? 'Reject this submission?'
                  : action === 'approve'
                    ? 'Approve and publish this submission?'
                    : selected?.title}
          </DialogTitle>
          <DialogDescription>
            {action === 'delete'
              ? 'This cannot be undone. The post will be removed from the league.'
              : 'Review the content below before confirming.'}
          </DialogDescription>
          {notice ? (
            <>
              <h3>{notice.title}</h3>
              <p className="admin-notice-preview">{notice.body}</p>
            </>
          ) : (
            selected && content(selected)
          )}
          <p role="alert">{message}</p>
          <div className="formactions">
            <button
              className="outline"
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setNotice(null);
              }}
            >
              Cancel
            </button>
            {notice || action ? (
              <button className="primary" disabled={busy} onClick={submit}>
                {busy
                  ? 'Saving…'
                  : notice
                    ? 'Publish announcement'
                    : action === 'delete'
                      ? 'Delete permanently'
                      : action === 'reject'
                        ? 'Confirm rejection'
                        : 'Approve & publish'}
              </button>
            ) : (
              selected &&
              mode === 'submissions' && (
                <>
                  {selected.approved !== 1 && (
                    <button
                      className="primary"
                      onClick={() => setAction('approve')}
                    >
                      Approve
                    </button>
                  )}
                  {selected.approved !== -1 && (
                    <button
                      className="outline"
                      onClick={() => setAction('reject')}
                    >
                      Reject
                    </button>
                  )}
                </>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
function Announcement({
  onPreview,
  onDirty,
}: {
  onPreview: (value: { title: string; body: string }) => void;
  onDirty: (value: boolean) => void;
}) {
  return (
    <form
      style={{ marginTop: 32 }}
      onChange={() => onDirty(true)}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onPreview({
          title: (f.get('title') as string).trim(),
          body: (f.get('body') as string).trim(),
        });
      }}
    >
      <h3>New announcement</h3>
      <label>
        Title
        <input name="title" required maxLength={150} />
      </label>
      <label>
        Announcement
        <textarea name="body" required maxLength={40000} />
      </label>
      <button className="primary">Preview announcement</button>
    </form>
  );
}
