/* eslint-disable nextjs/no-img-element -- Generated PNG previews. */
'use client';
import { useState } from 'react';
import { mediaGraphics } from '../media';
import { events, getCurrentLeagueRound } from '../racing';
import { useClock } from '../race-ui';
import { PngExport } from '../png-export';
import type { Entry } from '../league';
export function MediaCentre({ data, initialRound }: { data: Entry[]; initialRound?: number }) {
  const now = useClock();
  const [selected, setSelected] = useState<number | undefined>(initialRound);
  const [previews, setPreviews] = useState<{label:string; url:string; filename:string}[]>([]);
  const [status, setStatus] = useState('');
  const round = selected ?? (now === null ? undefined : getCurrentLeagueRound(data, now)?.round);
  if (!round) return <p>Select a scheduled round once the schedule loads.</p>;
  const graphics = mediaGraphics(data, round);
  async function previewAll() {
    setStatus('Generating PNG...');
    await new Promise(r => setTimeout(r, 30));
    try {
      setPreviews(graphics.filter(g => g.available).map(g => ({label:g.label, url:g.draw(document.createElement('canvas')).toDataURL('image/png'), filename:`RLS1-S1-R${round}-${g.id}.png`}))); setStatus('PNG previews ready');
    } catch { setStatus('Unable to generate graphics. Please try again.'); }
  }
  return <section className="panel">
    <p className="eyebrow">RLS1 MEDIA CENTRE</p>
    <label>Round<select value={round} onChange={e => {setSelected(Number(e.target.value));setPreviews([]);setStatus('');}}>{events(data).map(e => <option key={e.round} value={e.round}>Round {String(e.round).padStart(2,'0')} — {e.country}</option>)}</select></label>
    <p className="muted">Official graphics. Championship standings include published races through this round.</p>
    {graphics.slice(0,3).every(g => g.available) && <p className="badge">ROUND MEDIA READY</p>}
    <button className="outline" disabled={!graphics.some(g=>g.available)} onClick={previewAll}>Preview All</button>
    <output aria-live="polite">{status}</output>
    <div className="media-grid">{graphics.map(g => <article className="panel" key={`${round}-${g.id}`}>
      <h3>{g.label}</h3><p>{g.available ? '✓ Published data available' : 'Not published yet'}</p>
      {g.available ? <PngExport label={`Preview / Save ${g.id.toUpperCase()} PNG`} filename={`RLS1-S1-R${round}-${g.id}.png`} draw={g.draw}/> : <button className="primary" disabled>Save PNG</button>}
    </article>)}</div>
    {previews.map(p => <figure key={p.filename}><figcaption>{p.label}</figcaption><img src={p.url} alt={p.label} style={{width:'100%',height:'auto'}}/><a className="primary" href={p.url} download={p.filename}>Save {p.label} PNG</a></figure>)}
  </section>;
}
