export function parseLap(value: string): number {
  const s = value
    .trim()
    .replace(/^(\d+):(\d{2}):(\d{3})$/, '$1:$2.$3')
    .replace(/^(\d+):(\d{3})$/, '$1.$2');
  const m = s.match(/^(?:(\d+):)?(\d{1,2})\.(\d{3})$/);
  if (!m || Number(m[2]) >= 60)
    throw Error('Use a lap time such as 1:03.903 or 52.751.');
  const ms = Number(m[1] || 0) * 60000 + Number(m[2]) * 1000 + Number(m[3]);
  if (!Number.isSafeInteger(ms) || ms <= 0)
    throw Error('Enter a valid positive lap time.');
  return ms;
}
export const formatLap = (ms: number) =>
  `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`;
export const gap = (ms: number, best: number) =>
  ms === best ? 'Leader' : `+${((ms - best) / 1000).toFixed(3)}`;
export type QualRow = {
  driver: string;
  team: string;
  ms?: number;
  attempts?: number;
};
export function sortQual<T extends { ms?: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.ms ?? Infinity) - (b.ms ?? Infinity));
}
export function fastestDuel<T extends { duelMs?: number }>(
  rows: T[],
): T | undefined {
  return rows
    .filter((r) => Number.isFinite(r.duelMs) && r.duelMs! > 0)
    .sort((a, b) => a.duelMs! - b.duelMs!)[0];
}
