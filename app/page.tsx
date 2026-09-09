'use client';
import { BrowserLink as Link } from './browser-link';
import { useState, useEffect } from 'react';
import { Dashboard } from './dashboard';
import { Championship } from './championship';
import { useLeague, Community, Control } from './league';
import { SeasonResults, CalendarView, DriverProfiles } from './season-views';
import {
  Flag,
  Trophy,
  Play,
  MessageSquare,
  Shield,
  CalendarDays,
  Users,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
const views = [
  { id: 'home', label: 'Home', Icon: Flag },
  { id: 'results', label: 'Results', Icon: Flag },
  { id: 'standings', label: 'Championships', Icon: Trophy },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'drivers', label: 'Drivers', Icon: Users },
  { id: 'videos', label: 'Videos', Icon: Play },
  { id: 'paddock', label: 'Paddock', Icon: MessageSquare },
  { id: 'control', label: 'Noticeboard', Icon: Shield },
];
export default function Home() {
  const [tab, setTab] = useState('home');
  const [round, setRound] = useState(6);
  const league = useLeague();
  useEffect(() => {
    const apply = () => {
      const match = location.hash.match(/^#round-(\d+)$/);
      if (match && Number(match[1]) >= 1 && Number(match[1]) <= 24) {
        setRound(Number(match[1]));
        setTab('results');
      }
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);
  const openEvent = (r: number) => {
    setRound(r);
    setTab('results');
    history.replaceState(null, '', `#round-${r}`);
    document.getElementById('main-content')?.scrollIntoView();
  };
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" href="/">
          <Flag />
          <strong>
            RLS1<span> eSPORTS</span>
          </strong>
        </Link>
        <span className="season">
          SEASON 01 <i /> THE PADDOCK
        </span>
        <Link className="outline" href="/admin">
          <Shield size={16} /> Race control
        </Link>
      </header>
      <main id="main-content">
        <div className="intro">
          <div>
            <p className="eyebrow">THE HOME OF YOUR RACING LEAGUE</p>
            <h1>Every lap. Every rivalry.</h1>
          </div>
          <span className="status">
            <i /> Season 1 · 24 rounds
          </span>
        </div>
        <div aria-live="polite">
          {league.error && (
            <p className="error">
              Saved season results are available. Community updates are
              temporarily unavailable.{' '}
              <button className="outline" onClick={league.refresh}>
                Retry
              </button>
            </p>
          )}
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList className="mainnav" variant="line">
            {views.map(({ id, label, Icon }) => (
              <TabsTrigger key={id} value={id}>
                <Icon size={17} />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="home">
            <Dashboard
              data={league.data}
              onEvent={openEvent}
              onStandings={() => setTab('standings')}
            />
          </TabsContent>
          <TabsContent value="results">
            <SeasonResults
              data={league.data}
              round={round}
              onRound={openEvent}
            />
          </TabsContent>
          <TabsContent value="standings">
            <Championship data={league.data} />
          </TabsContent>
          <TabsContent value="calendar">
            <CalendarView data={league.data} onEvent={openEvent} />
          </TabsContent>
          <TabsContent value="drivers">
            <DriverProfiles data={league.data} />
          </TabsContent>
          <TabsContent value="videos">
            <Community kind="video" league={league} />
          </TabsContent>
          <TabsContent value="paddock">
            <Community kind="story" league={league} />
          </TabsContent>
          <TabsContent value="control" keepMounted>
            <Control league={league} />
          </TabsContent>
        </Tabs>
        <footer>
          <span className="brand">
            RLS1 <span>eSPORTS</span>
          </span>
          <span>Built for the grid. Powered by the community.</span>
          <span>SEASON 01 / 2026–27</span>
        </footer>
      </main>
    </>
  );
}
