'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useClock } from '../race-ui';
import { Flag, ShieldCheck, ArrowUpRight, LogOut, Menu } from 'lucide-react';
import { useLeague } from '../league';
import { ResultEditor } from '../result-editor';
import { EventEditor } from '../event-editor';
import { Championship } from '../championship';
import { DriverProfiles } from '../season-views';
import { nextEvent, raceEntries } from '../racing';
import { roundNumber } from '../season';
import { PublishingDesk } from '../publishing-desk';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import './admin.css';
const modules = [
  ['dashboard', 'Dashboard', 'Overview'],
  ['events', 'Events', 'Race management'],
  ['qualifying', 'Qualifying', 'Race management'],
  ['results', 'Race results', 'Race management'],
  ['stewarding', 'Stewarding', 'Race management'],
  ['standings', 'Standings', 'Championship'],
  ['drivers', 'Drivers & teams', 'Championship'],
  ['submissions', 'Guest submissions', 'Content'],
  ['publishing', 'Publishing desk', 'Publishing'],
];
const href = (id: string) => (id === 'dashboard' ? '/admin' : `/admin/${id}`);
export function AdminLogin() {
  const [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function signIn(form: HTMLFormElement) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const key = (new FormData(form).get('key') as string) || '';
      const r = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error || 'Unable to sign in.');
      form.reset();
      window.location.replace('/admin');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="admin-login">
      <Link prefetch={false} className="brand" href="/">
        <Flag /> RLS1 <span>eSPORTS</span>
      </Link>
      <section className="panel login-card">
        <ShieldCheck size={36} />
        <p className="eyebrow">LEAGUE OPERATIONS / SEASON 01</p>
        <h1>Admin portal</h1>
        <p className="muted">
          Organiser access only. Sign in to manage the league.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void signIn(e.currentTarget);
          }}
        >
          <label htmlFor="organiser-key">Organiser key</label>
          <div className="password-field">
            <input
              id="organiser-key"
              name="key"
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              required
              maxLength={4096}
              disabled={busy}
              aria-describedby="login-help login-error"
            />
            <button
              type="button"
              className="outline"
              onClick={() => setVisible(!visible)}
              aria-pressed={visible}
            >
              {visible ? 'Hide' : 'Show'}
            </button>
          </div>
          <p id="login-help" className="footnote">
            Your session lasts eight hours. Use the key supplied by the site
            owner.
          </p>
          <p id="login-error" role="alert">
            {error}
          </p>
          <button className="primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <Link prefetch={false} className="admin-back" href="/">
          ← Return to the public site
        </Link>
      </section>
    </main>
  );
}
export function AdminPortal({
  section,
  initialRound,
}: {
  section: string;
  initialRound?: number;
}) {
  const league = useLeague('admin'),
    [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [destination, setDestination] = useState('');
  const leaving = useRef(false);
  // Re-check on return to the tab and periodically; every mutation is independently authorised.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (
        !leaving.current &&
        document.querySelector('[data-admin-dirty="true"]')
      )
        event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    const check = async () => {
      try {
        const r = await fetch('/api/admin/session', { cache: 'no-store' });
        const d = (await r.json()) as { authenticated?: boolean };
        if (r.ok && !d.authenticated)
          window.location.replace('/admin?expired=1');
      } catch {}
    };
    const focus = () => {
      void check();
    };
    window.addEventListener('focus', focus);
    const timer = window.setInterval(focus, 60000);
    return () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('focus', focus);
      window.clearInterval(timer);
    };
  }, []);
  async function logout(discard = false) {
    if (busy) return;
    if (!discard && document.querySelector('[data-admin-dirty="true"]')) {
      setDestination('logout');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/session', { method: 'DELETE' });
      if (!r.ok) throw Error('Could not log out. Please try again.');
      leaving.current = true;
      window.location.replace('/admin');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const now = useClock();
  const upcoming = nextEvent(league.data, now ?? 0),
    races = raceEntries(league.data),
    latest = races[races.length - 1],
    pending = league.data.filter(
      (e) => ['story', 'video'].includes(e.kind) && e.approved === 0,
    ).length;
  return (
    <div
      className="admin-shell"
      onClickCapture={(e) => {
        const link = (e.target as HTMLElement).closest('a');
        if (
          link &&
          link.origin === location.origin &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey &&
          e.button === 0
        ) {
          e.preventDefault();
          e.stopPropagation();
          if (document.querySelector('[data-admin-dirty="true"]'))
            setDestination(link.href);
          else window.location.assign(link.href);
        }
      }}
    >
      <header className="admin-header">
        <Link prefetch={false} href="/admin" className="brand">
          <Flag /> RLS1 <span>ADMIN</span>
        </Link>
        <span className="admin-identity">Logged in as Organiser</span>
        <Link prefetch={false} href="/" className="outline">
          Public site <ArrowUpRight size={15} />
        </Link>
        <button className="outline" onClick={() => logout()} disabled={busy}>
          <LogOut size={16} />
          {busy ? 'Logging out…' : 'Log out'}
        </button>
      </header>
      <button
        className="outline admin-menu"
        onClick={() => setMenu(!menu)}
        aria-expanded={menu}
        aria-controls="admin-nav"
      >
        <Menu size={18} /> {menu ? 'Close menu' : 'Admin menu'}
      </button>
      <div className="admin-layout">
        <nav
          id="admin-nav"
          className={`admin-sidebar ${menu ? 'is-open' : ''}`}
          aria-label="Admin navigation"
        >
          {modules.map(([id, label, group], i) => (
            <div key={id}>
              {(i === 0 || modules[i - 1][2] !== group) && (
                <p className="eyebrow">{group}</p>
              )}
              <Link
                prefetch={false}
                href={href(id)}
                aria-current={section === id ? 'page' : undefined}
              >
                {label}
                {id === 'submissions' && pending > 0 && (
                  <span className="admin-count">{pending}</span>
                )}
              </Link>
            </div>
          ))}
          <p className="footnote">
            Shared organiser access
            <br />
            Session expires after 8 hours
          </p>
        </nav>
        <main className="admin-main">
          <div className="admin-title">
            <p className="eyebrow">RLS1 ADMIN PORTAL</p>
            <h1>{modules.find((m) => m[0] === section)?.[1]}</h1>
            <p className="muted">
              {section === 'dashboard'
                ? 'League control centre. Every update starts here.'
                : 'Review your changes before publishing to the public site.'}
            </p>
          </div>
          {(error || league.error) && (
            <p role="alert" className="error">
              {error || league.error}{' '}
              <button className="outline" onClick={league.refresh}>
                Retry
              </button>
            </p>
          )}
          {league.loading && !league.isAdmin ? (
            <output className="panel">Loading league records…</output>
          ) : !league.isAdmin ? (
            <section className="panel">
              Admin records are unavailable. Retry before editing.
            </section>
          ) : (
            <>
              {section === 'dashboard' && (
                <>
                  <div className="admin-stats">
                    <Link
                      prefetch={false}
                      className="panel"
                      href="/admin/events"
                    >
                      <p className="eyebrow">NEXT EVENT</p>
                      <h2>
                        {upcoming
                          ? `Round ${upcoming.round}`
                          : 'Season complete'}
                      </h2>
                      <p>{upcoming?.country || 'No upcoming event'}</p>
                      <span>Edit event →</span>
                    </Link>
                    <Link
                      prefetch={false}
                      className="panel"
                      href="/admin/standings"
                    >
                      <p className="eyebrow">CHAMPIONSHIP</p>
                      <h2>
                        {latest
                          ? `Round ${roundNumber(latest.title)}`
                          : 'Awaiting results'}
                      </h2>
                      <p>Latest published race</p>
                      <span>View standings →</span>
                    </Link>
                    <Link
                      prefetch={false}
                      className="panel"
                      href="/admin/results"
                    >
                      <p className="eyebrow">LATEST RESULT</p>
                      <h2>{latest ? latest.title : 'No results yet'}</h2>
                      <span>Manage results →</span>
                    </Link>
                    <Link
                      prefetch={false}
                      className="panel"
                      href="/admin/submissions"
                    >
                      <p className="eyebrow">PENDING REVIEW</p>
                      <h2>{pending}</h2>
                      <p>Guest submissions</p>
                      <span>Review posts →</span>
                    </Link>
                  </div>
                  <section className="panel">
                    <p className="eyebrow">QUICK ACTIONS</p>
                    <h2>Manage your league</h2>
                    <div className="admin-shortcuts">
                      {modules.slice(1).map(([id, label]) => (
                        <Link
                          prefetch={false}
                          className="outline"
                          href={href(id)}
                          key={id}
                        >
                          {label} →
                        </Link>
                      ))}
                    </div>
                  </section>
                  <section className="panel">
                    <h3>From draft to published</h3>
                    <p className="muted">
                      Choose a module, select the round, edit and preview.
                      Confirm publication only when the details are ready.
                      Browser drafts stay on this device; published records are
                      shared with everyone.
                    </p>
                  </section>
                </>
              )}
              {section === 'events' && (
                <EventEditor
                  league={league}
                  fixedMode="event"
                  initialRound={initialRound ?? upcoming?.round ?? 7}
                />
              )}
              {section === 'stewarding' && (
                <>
                  <EventEditor
                    league={league}
                    fixedMode="penalty"
                    initialRound={initialRound ?? upcoming?.round ?? 7}
                  />
                  <PublishingDesk league={league} mode="stewarding" />
                </>
              )}
              {section === 'qualifying' && (
                <ResultEditor
                  league={league}
                  sessionKind="qualifying"
                  initialRound={initialRound}
                />
              )}
              {section === 'results' && (
                <ResultEditor
                  league={league}
                  sessionKind="race"
                  initialRound={initialRound}
                />
              )}
              {section === 'standings' && (
                <>
                  <p className="footnote">
                    Read-only · Calculated from published race classifications.
                  </p>
                  <Championship data={league.data} />
                </>
              )}
              {section === 'drivers' && (
                <>
                  <p className="footnote">
                    Read-only · Roster and historical team records.
                  </p>
                  <DriverProfiles data={league.data} />
                </>
              )}
              {section === 'submissions' && (
                <PublishingDesk league={league} mode="submissions" />
              )}
              {section === 'publishing' && (
                <PublishingDesk league={league} mode="publishing" />
              )}
            </>
          )}
        </main>
      </div>
      <Dialog
        open={!!destination}
        onOpenChange={(v) => !v && setDestination('')}
      >
        <DialogContent>
          <DialogTitle>Leave unsaved changes?</DialogTitle>
          <DialogDescription>
            Your changes have not been published. Classification browser drafts
            remain on this device; other unsaved form edits will be discarded.
          </DialogDescription>
          <div className="formactions">
            <button className="outline" onClick={() => setDestination('')}>
              Keep editing
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                if (destination === 'logout') {
                  void logout(true);
                } else {
                  leaving.current = true;
                  window.location.assign(destination);
                }
              }}
            >
              Discard & continue
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
