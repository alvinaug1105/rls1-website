/* eslint-disable nextjs/no-img-element -- Generated PNG previews are local blob URLs; they cannot use server image optimization. */
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { graphicFilename, mediaGraphics } from '../media';
import { events } from '../racing';
import { pad2 } from '../site';
import type { Entry } from '../league';

type Render = { id: string; label: string; url?: string; size?: string; error?: string };

// Renders one graphic to a PNG blob URL. Canvas output is fixed-size and
// independent of the viewport; failures are reported per graphic.
async function render(draw: (c: HTMLCanvasElement) => HTMLCanvasElement) {
  const canvas = draw(document.createElement('canvas'));
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw Error('The browser could not encode this PNG.');
  return { url: URL.createObjectURL(blob), size: `${canvas.width}×${canvas.height}` };
}

export function MediaCentre({
  data,
  initialRound,
}: {
  data: Entry[];
  initialRound: number;
}) {
  const [round, setRound] = useState(initialRound);
  const [renders, setRenders] = useState<Render[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const urls = useRef(new Map<string, string>());
  const graphics = useMemo(() => mediaGraphics(data, round), [data, round]);
  const readiness = useMemo(
    () =>
      events(data).map((e) => ({
        ...e,
        ready: mediaGraphics(data, e.round).filter((g) => g.available).length,
      })),
    [data],
  );
  const available = graphics.filter((g) => g.available);
  const release = (ids?: string[]) => {
    for (const [id, url] of urls.current)
      if (!ids || ids.includes(id)) {
        URL.revokeObjectURL(url);
        urls.current.delete(id);
      }
  };
  useEffect(() => () => release(), []);

  async function generate(ids: string[]) {
    if (busy) return [];
    setBusy(true);
    release(ids);
    const out: Render[] = [];
    for (const [i, g] of graphics.filter((g) => ids.includes(g.id)).entries()) {
      setStatus(`Generating ${g.label} (${i + 1} of ${ids.length})…`);
      // Yield so the status paints before the synchronous canvas work.
      await new Promise((r) => setTimeout(r, 16));
      try {
        const r = await render(g.draw);
        urls.current.set(g.id, r.url);
        out.push({ id: g.id, label: g.label, ...r });
      } catch (e) {
        out.push({
          id: g.id,
          label: g.label,
          error: e instanceof Error ? e.message : 'Unable to generate this graphic.',
        });
      }
    }
    setRenders((prev) => [...prev.filter((r) => !ids.includes(r.id)), ...out]);
    const failed = out.filter((r) => r.error).length;
    setStatus(
      failed
        ? `${out.length - failed} of ${out.length} graphics ready · ${failed} failed. Retry the failed graphic.`
        : `${out.length} ${out.length === 1 ? 'graphic' : 'graphics'} ready.`,
    );
    setBusy(false);
    return out;
  }
  function save(r: Render) {
    if (!r.url) return;
    const a = document.createElement('a');
    a.href = r.url;
    a.download = graphicFilename(round, r.id);
    a.click();
  }
  async function downloadAll() {
    const out = await generate(available.map((g) => g.id));
    const ok = out.filter((r) => r.url);
    // Browsers may ask once to allow multiple downloads from this site.
    for (const r of ok) {
      save(r);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    if (ok.length)
      setStatus(`Download requested for ${ok.length} ${ok.length === 1 ? 'graphic' : 'graphics'}. If only one saved, allow multiple downloads for this site and retry.`);
  }
  return (
    <>
      <section className="panel media-toolbar" aria-labelledby="media-round-title">
        <div className="sectionhead">
          <div>
            <p className="eyebrow">RLS1 MEDIA CENTRE</p>
            <h2 id="media-round-title" className="section-title">
              Round {pad2(round)} — {events(data)[round - 1].country}
            </h2>
          </div>
          <span className={`badge${available.length === graphics.length ? ' verified' : ''}`}>
            {available.length} of {graphics.length} ready
          </span>
        </div>
        <div className="formactions">
          <label className="inline-field">
            Round
            <select
              value={round}
              disabled={busy}
              onChange={(e) => {
                release();
                setRenders([]);
                setStatus('');
                setRound(Number(e.target.value));
                history.replaceState(null, '', `/admin/media?round=${e.target.value}`);
              }}
            >
              {readiness.map((e) => (
                <option key={e.round} value={e.round}>
                  R{pad2(e.round)} · {e.country} — {e.ready}/{graphics.length} ready
                </option>
              ))}
            </select>
          </label>
          <button
            className="outline"
            disabled={busy || !available.length}
            onClick={() => void generate(available.map((g) => g.id))}
          >
            Preview all
          </button>
          <button
            className="primary"
            disabled={busy || !available.length}
            onClick={() => void downloadAll()}
          >
            Download all ({available.length})
          </button>
        </div>
        <p className="muted">
          Graphics use published data only. Championship graphics include races
          through Round {pad2(round)}. Unpublished graphics are never generated.
        </p>
        <output className="media-status" aria-live="polite">
          {status}
        </output>
      </section>
      <ul className="media-grid">
        {graphics.map((g) => {
          const r = renders.find((x) => x.id === g.id);
          return (
            <li className="panel media-card" key={`${round}-${g.id}`} data-ready={g.available}>
              <div className="media-card-head">
                <h3 className="card-title">{g.label}</h3>
                <span className="media-state">
                  <span aria-hidden="true">{g.available ? '✓' : '—'}</span>{' '}
                  {g.available ? 'Ready' : 'Not published'}
                </span>
              </div>
              {r?.url ? (
                <a href={r.url} target="_blank" rel="noopener" className="media-thumb">
                  <img src={r.url} alt={`${g.label} graphic for Round ${round}`} />
                </a>
              ) : (
                <div className="media-thumb is-empty" aria-hidden="true">
                  {g.available ? 'Preview not generated' : 'Awaiting published data'}
                </div>
              )}
              {r?.error && (
                <p className="formstatus" role="alert">
                  {r.error}
                </p>
              )}
              <div className="formactions">
                <button
                  className="outline"
                  disabled={busy || !g.available}
                  onClick={() => void generate([g.id])}
                >
                  {r?.error ? 'Retry' : r?.url ? 'Regenerate' : 'Preview'}
                </button>
                {r?.url ? (
                  <a className="primary" href={r.url} download={graphicFilename(round, g.id)}>
                    Download PNG
                  </a>
                ) : (
                  <button
                    className="primary"
                    disabled={busy || !g.available}
                    onClick={async () => {
                      const [out] = await generate([g.id]);
                      if (out) save(out);
                    }}
                  >
                    Download PNG
                  </button>
                )}
              </div>
              {r?.size && <p className="footnote">{r.size} px · {graphicFilename(round, g.id)}</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
