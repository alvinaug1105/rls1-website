'use client';
import { useEffect, useState } from 'react';
import { Check, Copy, Flag } from 'lucide-react';
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
export function CopyButton({
  text,
  label = 'Copy Discord recap',
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false),
    [fallback, setFallback] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setCopied(false));
  }, [text]);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(id);
  }, [copied]);
  return (
    <>
      <button
        className="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          } catch {
            setFallback(true);
          }
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        <span aria-live="polite">{copied ? 'Copied' : label}</span>
      </button>
      <Dialog open={fallback} onOpenChange={setFallback}>
        <DialogContent>
          <DialogTitle>Copy your recap</DialogTitle>
          <DialogDescription>
            Automatic copying is unavailable. Select and copy this text.
          </DialogDescription>
          <textarea
            aria-label="Discord recap"
            readOnly
            rows={10}
            value={text}
            onFocus={(e) => e.target.select()}
          />
        </DialogContent>
      </Dialog>
    </>
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
export function useClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
