import {
  formatLap,
  gap,
  sortQual,
  fastestDuel,
  type QualRow,
} from './result-utils';
import { duelBracket, duelFastest, type DuelRecord } from './duel';
import type { Row } from './league';
import { schedule } from './season';
export type GraphicRow = { cells: string[]; accent?: boolean };
export type Graphic = {
  round: number;
  title: string;
  subtitle: string;
  headers: string[];
  widths: number[];
  rows: GraphicRow[];
  footer: string[];
};
export function qualifyingGraphic(
  round: number,
  input: QualRow[],
  partial = false,
  count = input.length,
): Graphic {
  const rows = sortQual(input);
  return {
    round,
    title: 'QUALIFYING RESULTS',
    subtitle: `${partial ? 'PARTIAL CLASSIFICATION' : 'CLASSIFICATION'} · ${count} DRIVERS`,
    headers: ['POS', 'DRIVER / TEAM', 'ATTEMPTS', 'BEST LAP', 'GAP'],
    widths: [80, 490, 140, 170, 220],
    rows: rows.map((r, i) => ({
      accent: i === 0,
      cells: [
        String(i + 1),
        `${r.driver}\n${r.team || '—'}`,
        r.attempts ? `${r.attempts}/3` : '—',
        r.ms ? formatLap(r.ms) : '—',
        r.ms && rows[0]?.ms ? gap(r.ms, rows[0].ms) : '—',
      ],
    })),
    footer: partial
      ? ['Partial archive · available positions and times only']
      : [],
  };
}
export function raceGraphic(round: number, rows: Row[]): Graphic {
  const fastest = fastestDuel(rows);
  return {
    round,
    title: 'RACE RESULTS',
    subtitle: 'PUBLISHED CLASSIFICATION',
    headers: ['POS', 'DRIVER / TEAM', 'TIME / GAP', 'POINTS'],
    widths: [80, 600, 240, 180],
    rows: rows.map((r, i) => ({
      accent: i === 0,
      cells: [
        String(i + 1),
        `${r.driver}\n${r.team || '—'}`,
        String(
          (r as Row & { gap?: string; time?: string }).gap ||
            (r as Row & { time?: string }).time ||
            '—',
        ),
        String(r.points ?? '—'),
      ],
    })),
    footer: fastest?.duelMs
      ? [`FASTEST DUEL LAP · ${fastest.driver} — ${formatLap(fastest.duelMs)}`]
      : [],
  };
}
export function wrapText(
  c: CanvasRenderingContext2D,
  text: string,
  width: number,
): string[] {
  return text.split('\n').flatMap((paragraph) => {
    const lines: string[] = [];
    let line = '';
    for (const char of Array.from(paragraph)) {
      if (line && c.measureText(line + char).width > width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
    lines.push(line);
    return lines;
  });
}
function context(canvas: HTMLCanvasElement) {
  const c = canvas.getContext('2d');
  if (!c) throw Error('PNG export is not supported by this browser.');
  return c;
}
function font(c: CanvasRenderingContext2D, size = 24, bold = false) {
  c.font = `${bold ? '700' : '400'} ${size}px Arial`;
  c.textBaseline = 'top';
}
function text(
  c: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  width: number,
  size = 24,
  color = '#edf2fa',
  bold = false,
) {
  font(c, size, bold);
  c.fillStyle = color;
  const lines = wrapText(c, s, width);
  lines.forEach((line, i) => c.fillText(line, x, y + i * (size + 9)));
  return lines.length * (size + 9);
}
function base(
  canvas: HTMLCanvasElement,
  title: string,
  round: number,
  width: number,
  height: number,
) {
  canvas.width = width;
  canvas.height = height;
  const c = context(canvas);
  c.fillStyle = '#0b101b';
  c.fillRect(0, 0, width, height);
  c.fillStyle = '#ff443d';
  c.fillRect(0, 0, width, 12);
  text(c, 'RLS1 eSPORTS / SEASON 01', 40, 42, width - 80, 22, '#b5c2d6', true);
  text(c, title, 40, 90, width - 80, 42, '#ffffff', true);
  text(
    c,
    `ROUND ${String(round).padStart(2, '0')} · ${schedule.find((e) => e.round === round)?.country.toUpperCase() || ''}`,
    40,
    155,
    width - 80,
    28,
    '#ff6b63',
    true,
  );
  return c;
}
export function drawResultGraphic(canvas: HTMLCanvasElement, g: Graphic) {
  const c = context(canvas);
  font(c);
  const heights = g.rows.map((r) =>
    Math.max(
      80,
      ...r.cells.map(
        (cell, i) => wrapText(c, cell, g.widths[i] - 28).length * 33 + 28,
      ),
    ),
  );
  const footer = g.footer.join('\n');
  font(c);
  const footerHeight = footer ? wrapText(c, footer, 1100).length * 33 + 24 : 0;
  base(
    canvas,
    g.title,
    g.round,
    1200,
    330 + heights.reduce((a, b) => a + b, 0) + footerHeight + 60,
  );
  text(c, g.subtitle, 40, 215, 1120, 18, '#a7b6ca');
  let x = 40;
  g.headers.forEach((h, i) => {
    text(c, h, x, 267, g.widths[i] - 20, 16, '#a7b6ca', true);
    x += g.widths[i];
  });
  let y = 310;
  g.rows.forEach((r, i) => {
    c.fillStyle = r.accent ? '#282039' : i % 2 ? '#101826' : '#151f2e';
    c.fillRect(30, y, 1140, heights[i] - 4);
    x = 40;
    r.cells.forEach((cell, n) => {
      text(c, cell, x, y + 12, g.widths[n] - 28);
      x += g.widths[n];
    });
    y += heights[i];
  });
  if (footer) y += text(c, footer, 40, y + 16, 1100, 24, '#d7bfff') + 24;
  text(c, 'RLS1 eSports · Race Control', 40, y + 22, 1100, 16, '#8ea0b8');
  return canvas;
}
export function drawDuelGraphic(
  canvas: HTMLCanvasElement,
  round: number,
  seeds: Row[],
  record?: DuelRecord,
  draft = false,
) {
  const matches = duelBracket(seeds, record?.winners),
    champion = matches[6].winner,
    fastest = duelFastest(record);
  const c = context(canvas);
  font(c);
  const lines = matches.map((m) =>
    [
      `${m.id}${m.bye ? ' · BYE' : ''}`,
      ...m.players.map(
        (p) =>
          `P${seeds.findIndex((s) => s.driver === p.driver) + 1} · ${p.driver}\n${p.team}${record?.laps[p.driver] ? `\n${formatLap(record.laps[p.driver])}` : ''}`,
      ),
      !m.ready
        ? 'Awaiting previous match'
        : m.winner
          ? `Advances: ${m.winner.driver}`
          : m.players.length
            ? 'Awaiting result'
            : 'Empty bracket slot',
    ].join('\n'),
  );
  const cardHeight = Math.max(
    220,
    ...lines.map((s) => wrapText(c, s, 420).length * 33 + 40),
  );
  const foot = `DUEL WINNER · ${champion?.driver || 'Awaiting final result'}${fastest ? `\nFASTEST DUEL LAP · ${fastest[0]} — ${formatLap(fastest[1])}` : ''}`;
  font(c, 24, true);
  const footHeight = wrapText(c, foot, 1400).length * 33;
  base(
    canvas,
    'DUEL BRACKET',
    round,
    1500,
    370 + 4 * (cardHeight + 20) + footHeight + 80,
  );
  text(
    c,
    draft
      ? 'DRAFT PREVIEW · NOT PUBLISHED'
      : record
        ? 'PUBLISHED DUEL RESULTS'
        : 'BRACKET AWAITING RESULTS',
    40,
    215,
    1420,
    20,
    '#b5c2d6',
  );
  const groups = [[0, 1, 2, 3], [4, 5], [6]];
  groups.forEach((ids, col) => {
    const x = 40 + col * 480;
    text(
      c,
      ['QUARTER-FINALS', 'SEMI-FINALS', 'FINAL'][col],
      x,
      265,
      440,
      22,
      '#ff6b63',
      true,
    );
    ids.forEach((id, i) => {
      const y =
        315 + (i + 0.5) * (4 / ids.length) * (cardHeight + 20) - cardHeight / 2;
      c.fillStyle = '#151f2e';
      c.fillRect(x, y, 460, cardHeight);
      text(c, lines[id], x + 20, y + 20, 420);
    });
  });
  const y = 340 + 4 * (cardHeight + 20);
  text(c, foot, 40, y, 1400, 24, '#d7bfff', true);
  text(
    c,
    'RLS1 eSports · Race Control',
    40,
    y + footHeight + 24,
    1400,
    16,
    '#8ea0b8',
  );
  return canvas;
}
