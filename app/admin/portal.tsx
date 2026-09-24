'use client';
import { useState, useEffect, useRef } from 'react';
import { BrowserLink as Link } from '../browser-link';
import { MediaCentre } from './media-centre';
import { MINUTE, useLeagueClock } from '../league-clock';
import { RoundControl } from './ops';
import { Deadline } from '../deadline';
import { Flag, ShieldCheck, ArrowUpRight, LogOut, Menu } from 'lucide-react';
import { useLeague } from '../league';
import { DuelEditor } from '../duel-ui';
import { ResultEditor } from '../result-editor';
import { EventEditor } from '../event-editor';
import { Championship } from '../championship';
import { DriverProfiles } from '../drivers-view';
import { getCurrentLeagueRound } from '../racing';
import { schedule, SEASON } from '../season';
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
  ['duel', 'Duel', 'Race management'],
  ['results', 'Race results', 'Race management'],
  ['stewarding', 'Stewarding', 'Race management'],
  ['standings', 'Standings', 'Championship'],
  ['drivers', 'Drivers & teams', 'Championship'],
  ['media', 'Media Centre', 'Content'],
  ['submissions', 'Guest submissions', 'Content'],
  ['publishing', 'Publishing desk', 'Publishing'],
];
const href = (id: string) => (id === 'dashboard' ? '/admin' : `/admin/${id}`);
export function AdminLogin({ notice }: { notice?: 'error' | 'expired' }) {
  const [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(
      notice === 'error'
        ? 'Key not accepted. Check your organiser key and try again.'
        : notice === 'expired'
          ? 'Your session ended. Sign in again to continue.'
          : '',
    );
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
      <Link className="brand" href="/">
        <Flag /> RLS1 <span>eSPORTS</span>
      </Link>
      <section className="panel login-card">
        <ShieldCheck size={36} />
        <p className="eyebrow">LEAGUE OPERATIONS / {SEASON.label.toUpperCase()}</p>
        <h1>League control centre</h1>
        <p className="muted">
          Organiser access only. Sign in to manage the league.
        </p>
        {/* method/action make a pre-hydration submit a same-origin POST, so the
            key can never be serialised into the page URL. */}
        <form
          method="post"
          action="/api/admin/session"
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
        <Link className="admin-back" href="/">
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
  // Minute resolution: editors must not re-render every second.
  const now = useLeagueClock(MINUTE);
  const upcoming = now === null ? undefined : getCurrentLeagueRound(league.data, now),
    defaultRound = initialRound ?? upcoming?.round ?? schedule.length,
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
          link.target !== '_blank' &&
          !link.hasAttribute('download') &&
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
        <Link href="/admin" className="brand">
          <Flag /> RLS1 <span>ADMIN</span>
        </Link>
        <span className="admin-identity">Logged in as Organiser</span>
        <Link href="/" className="outline">
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
                ? 'Race operations for the selected round. Every action opens the specialist editor.'
                : section === 'media'
                  ? 'Generate official graphics from published league results.'
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
          {(league.loading && !league.isAdmin) || now === null ? (
            <output className="panel admin-loading">
              <span className="skeleton-line wide" />
              Loading league records…
            </output>
          ) : !league.isAdmin ? (
            <section className="panel">
              Admin records are unavailable. Retry before editing.
            </section>
          ) : (
            <>
              {section === 'dashboard' && (
                <RoundControl
                  data={league.data}
                  round={defaultRound}
                  current={upcoming?.round}
                  now={now!}
                />
              )}
              {section === 'media' && <MediaCentre data={league.data} initialRound={defaultRound} />}
              {section === 'events' && (
                <EventEditor
                  league={league}
                  fixedMode="event"
                  initialRound={defaultRound}
                />
              )}
              {section === 'stewarding' && (
                <>
                  <EventEditor
                    league={league}
                    fixedMode="penalty"
                    initialRound={defaultRound}
                  />
                  <PublishingDesk league={league} mode="stewarding" />
                </>
              )}
              {section === 'qualifying' && (
                <ResultEditor
                  league={league}
                  sessionKind="qualifying"
                  initialRound={defaultRound}
                />
              )}
              {section === 'duel' && (
                <DuelEditor
                  league={league}
                  initialRound={defaultRound}
                />
              )}
              {section === 'results' && (
                <ResultEditor
                  league={league}
                  sessionKind="race"
                  initialRound={defaultRound}
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
                <>
                  <PublishingDesk league={league} mode="publishing" />
                  <section className="panel" aria-labelledby="deadline-title">
                    <p className="eyebrow">DISCORD HELPER</p>
                    <h2 id="deadline-title" className="section-title">
                      Make a local-time deadline
                    </h2>
                    <Deadline />
                  </section>
                </>
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
