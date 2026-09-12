/* eslint-disable nextjs/no-img-element -- Locally generated PNG preview. */
'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export function PngExport({
  label,
  filename,
  draw,
}: {
  label: string;
  filename: string;
  draw: (canvas: HTMLCanvasElement) => HTMLCanvasElement;
}) {
  const [preview, setPreview] = useState(''),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true);
    setStatus('Generating PNG...');
    await new Promise((r) => setTimeout(r, 30));
    try {
      setPreview(draw(document.createElement('canvas')).toDataURL('image/png'));
      setStatus('PNG ready to save');
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : 'Unable to generate PNG. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="primary" disabled={busy} onClick={generate}>
        {busy ? 'Generating PNG...' : label}
      </button>
      <output aria-live="polite">{status}</output>
      <Dialog
        open={!!preview}
        onOpenChange={(v) => {
          if (!v) setPreview('');
        }}
      >
        <DialogContent className="qual-preview png-preview">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Full-resolution RLS1 graphic. Download it to share, or hold the
            image to save on your phone.
          </DialogDescription>
          {preview && (
            <img
              src={preview}
              alt={label}
              style={{ width: '100%', height: 'auto' }}
            />
          )}
          <a
            className="primary"
            href={preview}
            download={filename}
            onClick={() => setStatus('PNG saved · download requested')}
          >
            Download PNG
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
