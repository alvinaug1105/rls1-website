'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  Flag,
  Home,
  Menu,
  MessageSquare,
  Play,
  Shield,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { getCurrentLeagueRound } from './racing';
import { MINUTE, useLeagueClock } from './league-clock';
import { BrowserLink as Link, clientNav } from './browser-link';
import { Dashboard } from './dashboard';
import { Championship } from './championship';
import { useLeague, Community } from './league';
import { Noticeboard } from './noticeboard';
import { RoundView } from './round-view';
import { CalendarView } from './calendar-view';
import { DriverProfiles } from './drivers-view';
import { SEASON } from './season';
import { roundLabel, roundPath, validRound, views, type ViewId } from './site';

const icons: Record<ViewId, typeof Flag> = {
  home: Home,
  results: Flag,
  standings: Trophy,
  calendar: CalendarDays,
  drivers: Users,
  control: Shield,
  videos: Play,
  paddock: MessageSquare,
};
const titles: Record<ViewId, string> = {
  home: 'RLS1 eSports — Race week, results and championship',
  results: 'Round results — RLS1 eSports',
  standings: 'Championship standings — RLS1 eSports',
  calendar: 'Season calendar — RLS1 eSports',
  drivers: 'Driver profiles — RLS1 eSports',
  control: 'Race control noticeboard — RLS1 eSports',
  videos: 'Track videos — RLS1 eSports',
  paddock: 'Driver paddock — RLS1 eSports',
};

// Reads the address bar into a view. /rounds/N selects a round; the legacy
// "/#round-N" links shared before real routes existed still resolve.
function locate(): { view: ViewId; round: number | null } | null {
  const legacy = validRound(location.hash.match(/^#round-(\d+)$/)?.[1]);
  if (legacy) return { view: 'results', round: legacy };
  const round = validRound(location.pathname.match(/^\/rounds\/(\d+)\/?$/)?.[1]);
  if (round) return { view: 'results', round };
  const view = views.find((v) => v.path === location.pathname.replace(/\/$/, '') || (v.path === '/' && location.pathname === '/'));
  return view ? { view: view.id, round: null } : null;
}

export function LeagueApp({
  initialView = 'home',
  initialRound = null,
}: {
  initialView?: ViewId;
  initialRound?: number | null;
}) {
  const [view, setView] = useState<ViewId>(initialView);
  const [selectedRound, setRound] = useState<number | null>(initialRound);
  const [navOpen, setNavOpen] = useState(false);
  const league = useLeague();
  // Minute resolution: the shell re-renders when the race week or stage can
  // change, not every second. Only the countdown ticks each second.
  const now = useLeagueClock(MINUTE);
  const current = now === null ? undefined : getCurrentLeagueRound(league.data, now);
  const round = selectedRound ?? current?.round ?? null;

  useEffect(() => {
    const sync = () => {
      const found = locate();
      if (!found) return;
      setView(found.view);
      setRound(found.round);
      if (found.round && location.hash.startsWith('#round-'))
        history.replaceState(null, '', roundPath(found.round));
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    document.title =
      view === 'results' && round ? `${roundLabel(round)} — RLS1 eSports` : titles[view];
  }, [view, round]);

  const navigate = useCallback((next: ViewId, nextRound: number | null = null, tab?: string) => {
    const path =
      next === 'results' && nextRound
        ? roundPath(nextRound) + (tab ? `#${tab}` : '')
        : views.find((v) => v.id === next)!.path;
    if (location.pathname + location.hash !== path) history.pushState(null, '', path);
    setView(next);
    setRound(nextRound);
    setNavOpen(false);
    document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);
  const openRound = useCallback(
    (r: number, tab?: string) => navigate('results', r, tab),
    [navigate],
  );

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="RLS1 eSports home">
          <Flag aria-hidden="true" />
          <strong>
            RLS1<span> eSPORTS</span>
          </strong>
        </Link>
        <span className="season">
          {SEASON.label.toUpperCase()} <i aria-hidden="true" /> 24 ROUNDS
        </span>
        <button
          type="button"
          className="outline nav-toggle"
          aria-expanded={navOpen}
          aria-controls="league-navigation"
          onClick={() => setNavOpen(!navOpen)}
        >
          {navOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          Menu
        </button>
        <nav
          id="league-navigation"
          aria-label="League"
          className={`site-nav${navOpen ? ' is-open' : ''}`}
        >
          {views.map(({ id, label, path }) => {
            const Icon = icons[id];
            return (
              <a
                key={id}
                href={path}
                aria-current={view === id ? 'page' : undefined}
                onClick={(e) => clientNav(e, () => navigate(id))}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </a>
            );
          })}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        {league.error && (
          <p className="error" aria-live="polite">
            Saved season results are shown. Live league updates could not be
            loaded.{' '}
            <button className="outline" onClick={league.refresh}>
              Retry
            </button>
          </p>
        )}
        {view === 'home' && (
          <Dashboard data={league.data} now={now} onRound={openRound} onView={navigate} />
        )}
        {view === 'results' && (
          <RoundView data={league.data} round={round} now={now} onRound={openRound} />
        )}
        {view === 'standings' && <Championship data={league.data} />}
        {view === 'calendar' && (
          <CalendarView data={league.data} now={now} onRound={openRound} />
        )}
        {view === 'drivers' && <DriverProfiles data={league.data} />}
        {view === 'control' && <Noticeboard data={league.data} onRound={openRound} />}
        {view === 'videos' && <Community kind="video" league={league} />}
        {view === 'paddock' && <Community kind="story" league={league} />}
      </main>
      <footer className="site-footer">
        <span className="brand">
          RLS1 <span>eSPORTS</span>
        </span>
        <span>League times are Hong Kong time (HKT, UTC+8).</span>
        <span>
          {SEASON.label.toUpperCase()} / {SEASON.years} ·{' '}
          <Link href="/admin">Organiser login</Link>
        </span>
      </footer>
    </>
  );
}
