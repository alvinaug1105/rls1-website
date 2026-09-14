export class BodyLimitError extends Error {}
export async function limitedText(req: Request, limit: number) {
  if (Number(req.headers.get('content-length')) > limit) throw new BodyLimitError('Request too large.');
  if (!req.body) return '';
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let total = 0, text = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new BodyLimitError('Request too large.'); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
