'use client';
import { useState } from 'react';
import { Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Flag aria-hidden="true" />
      <h3>{title}</h3>
      <div className="muted">{children}</div>
    </div>
  );
}
export function ScoringRules() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="outline" onClick={() => setOpen(true)}>
        Scoring Rules
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Season 1 scoring</DialogTitle>
          <DialogDescription>
            Points awarded by race control count toward the championship.
          </DialogDescription>
          <p>P1–P7: 25, 18, 15, 12, 10, 8, 6 points.</p>
          <p>Fastest lap: 1 bonus point when awarded by race control.</p>
          <p>
            Published points include bonuses and adjustments. Constructors
            retain the points earned by drivers representing them at each round.
          </p>
          <p className="muted">
            Equal points are displayed alphabetically until race control
            confirms a tie-break.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
export { useLeagueClock as useClock } from './league-clock';
