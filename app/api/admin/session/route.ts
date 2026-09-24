import { limitedText, BodyLimitError } from '@/lib/request-body';
import { authenticated, organiserSecret } from '@/lib/organiser-auth';
import { json, sameOrigin, requestId, logServerError } from '@/lib/http';
import {
  mintSession,
  matchesKey,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from '@/lib/admin-session';
const response = (body: unknown, status = 200, cookie?: string) =>
  json(body, status, {
    Vary: 'Cookie',
    ...(cookie ? { 'Set-Cookie': cookie } : {}),
  });
function cookie(req: Request, value: string, age: number) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
// Native (pre-hydration or no-JS) form submissions POST here as
// application/x-www-form-urlencoded. They are answered with a 303 to a fixed
// internal path, so the key never appears in a URL and there is no open redirect.
function redirect(req: Request, path: '/admin' | '/admin?error=1', setCookie?: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(path, req.url).toString(),
      'Cache-Control': 'no-store, max-age=0',
      ...(setCookie ? { 'Set-Cookie': setCookie } : {}),
    },
  });
}
export async function GET(req: Request) {
  return response({ authenticated: await authenticated(req.headers) });
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return response({ error: 'Invalid origin.' }, 403);
  const form = (req.headers.get('content-type') || '').includes(
    'application/x-www-form-urlencoded',
  );
  try {
    const raw = await limitedText(req, 5000);
    const key = form
      ? new URLSearchParams(raw).get('key')
      : (JSON.parse(raw) as { key?: unknown } | null)?.key;
    const secret = organiserSecret();
    if (!secret)
      return form
        ? redirect(req, '/admin?error=1')
        : response(
            {
              error:
                'Organiser access is not configured. Ask the site owner to check the server secret.',
            },
            503,
          );
    if (typeof key !== 'string' || !(await matchesKey(key, secret)))
      return form
        ? redirect(req, '/admin?error=1')
        : response(
            { error: 'Key not accepted. Check your organiser key and try again.' },
            401,
          );
    const session = cookie(req, await mintSession(secret), SESSION_SECONDS);
    return form
      ? redirect(req, '/admin', session)
      : response({ authenticated: true }, 200, session);
  } catch (e) {
    if (!(e instanceof BodyLimitError) && !(e instanceof SyntaxError))
      logServerError('session POST', requestId(req), e);
    return response(
      { error: 'Unable to sign in. Please try again.' },
      e instanceof BodyLimitError ? 413 : 400,
    );
  }
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return response({ error: 'Invalid origin.' }, 403);
  return response({ authenticated: false }, 200, cookie(req, '', 0));
}
