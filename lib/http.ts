// Small shared helpers for the league API routes. Every API response is private
// and uncacheable; errors carry a short request reference for organiser support
// but never echo stack traces, request bodies or credentials.
export const NO_STORE = 'no-store, max-age=0';

export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': NO_STORE,
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

// CSRF defence for state-changing requests: browsers always send Origin on
// cross-site POST/PATCH/DELETE. Non-browser clients can forge it, so this is
// paired with server-side authentication, never used as identity.
export const sameOrigin = (req: Request) =>
  req.headers.get('origin') === new URL(req.url).origin;

export const requestId = (req: Request) =>
  req.headers.get('cf-ray') || crypto.randomUUID().slice(0, 8);

// Logs only the route, a reference and the error class/message. Callers must
// not pass request bodies, cookies or keys.
export function logServerError(route: string, id: string, error: unknown) {
  console.error(
    `[rls1] ${route} failed ref=${id}`,
    error instanceof Error
      ? `${error.name}: ${error.message.slice(0, 200)}`
      : 'Unknown error',
  );
}
