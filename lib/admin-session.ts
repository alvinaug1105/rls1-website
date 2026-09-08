export const SESSION_COOKIE = 'rls1_organiser';
export const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
async function signingKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}
function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
function decode(value: string) {
  return Uint8Array.from(
    atob(value.replaceAll('-', '+').replaceAll('_', '/')),
    (c) => c.charCodeAt(0),
  );
}
export async function mintSession(secret: string, now = Date.now()) {
  if (!secret) throw Error('Organiser access is not configured.');
  const payload = encode(
    encoder.encode(
      JSON.stringify({
        purpose: 'rls1-admin-v1',
        expires: now + SESSION_SECONDS * 1000,
        nonce: crypto.randomUUID(),
      }),
    ),
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(secret),
    encoder.encode(payload),
  );
  return `${payload}.${encode(new Uint8Array(signature))}`;
}
export async function verifySession(
  token: string,
  secret: string,
  now = Date.now(),
) {
  try {
    if (!secret || token.length > 1024) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payload, signature] = parts;
    if (
      !(await crypto.subtle.verify(
        'HMAC',
        await signingKey(secret),
        decode(signature),
        encoder.encode(payload),
      ))
    )
      return false;
    const data = JSON.parse(new TextDecoder().decode(decode(payload)));
    return (
      data.purpose === 'rls1-admin-v1' &&
      Number.isFinite(data.expires) &&
      data.expires > now &&
      data.expires <= now + SESSION_SECONDS * 1000 &&
      typeof data.nonce === 'string'
    );
  } catch {
    return false;
  }
}
export async function matchesKey(candidate: string, secret: string) {
  if (!secret || !candidate || candidate.length > 4096) return false;
  const digest = async (value: string) =>
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(value)),
    );
  const a = await digest(candidate),
    b = await digest(secret);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
