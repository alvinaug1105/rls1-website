import { authenticated, organiserSecret } from '@/lib/organiser-auth';
import {
  mintSession,
  matchesKey,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from '@/lib/admin-session';
const response = (body: unknown, status = 200, cookie?: string) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      Vary: 'Cookie',
      ...(cookie ? { 'Set-Cookie': cookie } : {}),
    },
  });
function cookie(req: Request, value: string, age: number) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function GET(req: Request) {
  return response({ authenticated: await authenticated(req.headers) });
}
export async function POST(req: Request) {
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return response({ error: 'Invalid origin.' }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 5000)
      return response({ error: 'Invalid organiser key.' }, 400);
    const data = JSON.parse(raw);
    const secret = organiserSecret();
    if (!secret)
      return response(
        {
          error:
            'Organiser access is not configured. Ask the site owner to check the server secret.',
        },
        503,
      );
    if (typeof data?.key !== 'string' || !(await matchesKey(data.key, secret)))
      return response(
        { error: 'Key not accepted. Check your organiser key and try again.' },
        401,
      );
    return response(
      { authenticated: true },
      200,
      cookie(req, await mintSession(secret), SESSION_SECONDS),
    );
  } catch {
    return response({ error: 'Unable to sign in. Please try again.' }, 400);
  }
}
export async function DELETE(req: Request) {
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return response({ error: 'Invalid origin.' }, 403);
  return response({ authenticated: false }, 200, cookie(req, '', 0));
}
