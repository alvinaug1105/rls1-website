# RLS1 eSports — League website

Race-week dashboard, Qualifying, the top-eight Duel, race results, WDC/WCC standings, calendar, driver profiles, race-control noticeboard and moderated community posts — plus the organiser portal at `/admin`.

## Public routes

| Route | Content |
|---|---|
| `/` | Current race week, stage timeline, countdown, championship battle, latest result |
| `/rounds/1` … `/rounds/24` | Round hub (Overview · Qualifying · Duel · Race · Stewarding); sections deep-link with `#qualifying`, `#duel`, `#race`, `#stewarding` |
| `/results` | The current round |
| `/championship`, `/calendar`, `/drivers`, `/noticeboard`, `/videos`, `/paddock` | Season views |

Old `/#round-N` links still work and are rewritten to `/rounds/N`.

## Local development

Requires Node.js 22.13 or later.

```sh
npm ci
npm run dev
```

Apply the schema in `drizzle/` to the local D1 binding. Set `LEAGUE_ADMIN_KEY` in a local `.dev.vars` file to enable organiser access. `.dev.vars`, `.wrangler/` and `dist/` are git-ignored; never commit keys.

## Checks

```sh
npx tsc --noEmit
npm run lint
node tests/racing.mjs        # archive fixture, WDC/WCC regression, race week, Duel, stages, stats
node tests/admin-session.mjs
node tests/result-png.mjs
node tests/clock.mjs
npm run build
```

Local-only integration tests (they refuse non-localhost targets and clean up their fixtures). Run against a dev server with a disposable local database, never production:

```sh
python3 tests/admin-http.py    --key-file <private local key file>
python3 tests/duel-http.py     --key-file <private local key file>
python3 tests/security-http.py --key-file <private local key file>
python3 tests/hardening-http.py --key-file <private local key file>
node tests/e2e-smoke.mjs       --key-file <private local key file>   # needs an existing Playwright install
```

`RLS_TEST_BASE` selects `http://localhost:3000`–`3003`.

## Deployment notes

The site builds with vinext for Cloudflare Workers with a D1 binding named `DB`. Configure `LEAGUE_ADMIN_KEY` as a Worker **secret**. Keep `/admin*` and `/api/*` uncached at the edge. See `RLS1-QUALITY-PASS-REPORT.md` for the current engineering status and remaining operational recommendations.

Historical rounds 1–5 (race) and 1–6 (qualifying) are included in `app/season.ts`; newer results live in D1.
