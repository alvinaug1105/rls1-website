import { env } from 'cloudflare:workers';
import { SESSION_COOKIE, verifySession, matchesKey } from './admin-session';
export function organiserSecret() {
  return (env as unknown as Record<string, string>).LEAGUE_ADMIN_KEY || '';
}
export async function authenticated(headers: Headers) {
  const token =
    headers
      .get('cookie')
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1) || '';
  return verifySession(token, organiserSecret());
}
export async function admin(req: Request) {
  return (
    (await authenticated(req.headers)) ||
    (await matchesKey(req.headers.get('x-league-key') || '', organiserSecret()))
  );
}
