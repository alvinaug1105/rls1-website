'use client';
import { useState } from 'react';
import { SEASON } from './season';
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
          <DialogTitle>{SEASON.label} scoring</DialogTitle>
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
// A horizontally scrollable table/chart region. WCAG 2.1.1 requires scrollable
// content to be reachable by keyboard, so the labelled region is focusable.
export function ScrollRegion({
  label,
  className = 'table-scroll',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-tabindex -- Focusable, labelled scroll container for keyboard users (WCAG 2.1.1); a <section> landmark per table would be noisier.
    <div className={className} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
