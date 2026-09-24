# RLS1 quality pass — engineering report (24 September 2026)

Branch `claude/sleepy-rubin-auaq8y`. Not deployed. No production data, secrets, D1 schema or Cloudflare bindings were touched. All testing used a disposable local D1 with local-only fixture data for Rounds 6–9.

## 1. Executive summary

RLS1 was functionally solid but had real defects hiding behind passing checks: the organiser key could leak into the URL on login, the homepage never received its security headers, the whole app re-rendered every second, and the round page contradicted itself about the fastest Duel lap. Those are fixed. The public site is now a race-week product with shareable round URLs, and the admin has an operations dashboard and publish impact previews. It also got smaller: 70 fewer installed packages, 51 unused components removed, about 4,500 fewer lines overall, and less JS and CSS shipped to visitors. Historical data and the WDC/WCC regressions are unchanged.

## 2. Audit findings (before)

| # | Finding | Severity |
|---|---|---|
| A1 | Login form had no `method`. A submit before hydration (slow network, password manager) sent a native `GET /admin?key=<organiser key>`: key in URL, history and server/CDN logs. Reproduced in the dev server log. | **P0 security** |
| A2 | vinext's `/:path*` header rule does not match `/`, so the **homepage had no CSP frame-ancestors, X-Frame-Options or nosniff**. The previous security test only checked `/admin*`. | **P0 security** |
| A3 | `useClock()` sat at the top of the public page and the admin portal, so the whole tree (standings, editors, tables) re-rendered every second. | P0 performance |
| A4 | The admin portal chose editors' default round with `nextEvent(data, now ?? 0)`. Before the clock synced, editors could open on the wrong round. | P0 admin bug |
| A5 | The round page showed "No duel lap published yet" beside a Duel panel that had one (two data sources for the same fact). | P0 incorrect display |
| A6 | Race-week pages rendered `Intl` dates on the server. The Worker's ICU and browsers format differently (`Wed 16 Sept` vs `Wed, 16 Sept`), which caused hydration failures once rounds became server-rendered. | P0 reliability |
| A7 | `.gitignore` and `.oxlintrc.json` were missing, so `npm run lint` linted `node_modules` and failed, and `.dev.vars`/`.wrangler` (the local DB) were unprotected from commits. | P0 hygiene |
| A8 | The Duel write was check-then-write, so qualifying could change between validation and write (documented residual). | Integrity |
| A9 | 51 of 60 vendored UI components and 8 runtime packages were unreachable. There was also dead code: `chatgpt-auth.ts` (trusted identity headers), `PngExport`, the old CSV publishing paths in `Compose`, and dead CSS. | Maintainability |
| A10 | Hash-only navigation (`#round-6`): no shareable section URLs, no per-round metadata, a sitemap with one URL, and nav built from ARIA tabs even though it navigates between pages. | IA / SEO |
| A11 | The organiser Discord deadline tool and a prominent "Race control → /admin" button were on the public site. | Public cleanliness |

## 3. Problems fixed

- **A1:** The form is now `method="post" action="/api/admin/session"`. The endpoint also accepts form-encoded logins and replies `303` to fixed internal paths (`/admin` or `/admin?error=1`), so there is no open redirect. The key never appears in a URL. Verified in the server log (`GET /admin?key=…` before, `POST … 303` after) and by `hardening-http.py` and `e2e-smoke.mjs`.
- **A2:** Added an explicit `/` header rule. Verified on the **built Worker** (wrangler) for `/`, public pages, `/admin` and `/api/*`. Also added `Cross-Origin-Opener-Policy: same-origin`, `form-action 'self'` and HSTS (`max-age=31536000`, no `includeSubDomains` because sibling workers.dev hosts are outside this site).
- **A3:** `useLeagueClock(resolution)` quantises the shared snapshot. The shell and portal use minute resolution; only the countdown ticks each second. There is still one shared interval and no extra network polling.
- **A4:** Editors mount only after the league clock resolves.
- **A5:** `roundSummary()` uses one source for the fastest Duel lap, labelled "recorded in the race classification" or "from the published Duel bracket".
- **A6:** Server-rendered dates use a deterministic formatter (`dayLabel`, `raceWeekLabel`), with regression tests.
- **A7:** Added `.gitignore` and `.oxlintrc.json`. Lint is 0 findings with correctness rules at error level and no broad ignores; there are two narrow, justified directives.
- **A8:** See §15.
- **Other:** The dashboard no longer crashes on malformed legacy video JSON. A steward decision can no longer be published twice from a stale form. Admin link interception no longer hijacks `target=_blank` links. Page-level horizontal overflow from escaped screen-reader captions is fixed.

## 4. UX improvements
- New visitors now see what RLS1 is, the current round, the current stage, the next session and the championship leader on the first screen.
- Nav is real links (`<nav>` with `aria-current`) and each section has its own URL. History back/forward works, focus moves to `<main>` on navigation, and there is a mobile menu.
- Community posts are labelled "COMMUNITY · not official league communications".
- The Discord deadline helper moved to Admin → Publishing desk. The organiser login link is in the footer.

## 5. Visual and design system
- `app/ui.css` is the single token source: surfaces, text, status colours (success/warning/danger), podium gold/silver/bronze, radius, spacing, a 44px control height and a type scale (display → page → section → card → body → meta → eyebrow). Numbers use tabular figures.
- The action red is darker for accessible contrast; the brand red stays for non-text accents.
- Motion is limited to small transitions that respect `prefers-reduced-motion`. I removed an infinite pulse after measurement showed it forced continuous repaints.

## 6. Homepage
The hero shows the round, flag, country, Wed–Sun dates, stage badge, **stage timeline**, countdown and a "View Round" link. Beside it is the championship battle (top three with points and gaps). Below are cards for Latest result (winner, pole, fastest Duel lap), Next round, and the latest Race control item (official notice or steward decision, with timestamp). Duel and Race times are never invented. An organiser-published `startAt` is shown as "Announced start".

## 7. Round, Qualifying, Duel and Race
- **Round hub** at `/rounds/N`: Overview · Qualifying · Duel · Race · Stewarding, deep-linkable with `#duel` and similar. Prev/next navigation, a summary of official results and per-round metadata. Legacy `/#round-N` redirects to `/rounds/N`.
- **Qualifying:** a pole card (driver, team, lap); a timing table with Pos | Driver | Team | Best lap | Gap | Attempts; podium accents; the team moves under the name on phones.
- **Duel:** four columns (QF → SF → Final → Duel winner). Seed chips, ✓ plus "Advances" text for winners, "Out" and strikethrough for eliminated drivers (not colour alone), byes, and per-match `aria-label` summaries. Two columns at tablet width, stacked stages on phones. The admin winner selectors are unchanged.
- **Race:** a timing board with a fastest-lap flag and a P1–P3 inset accent. Zero points display as `0`. A time/gap column appears only if the data has one.

## 8. Championship
Podium cards (points, gap, wins, podiums) and one standings table with Pos, Driver, Team, Points, Gap, Wins, Podiums and Move (▲/▼ with screen-reader text). The progression chart has direct end-of-line labels with collision avoidance, tooltips per point, and an exact-value table. It scrolls horizontally on phones instead of shrinking the text, and notes that only rounds with a published race are plotted. Tie-break rules are unchanged (alphabetical, noted on the page).

## 9. Drivers, Calendar, Noticeboard
- **Drivers:** championship position, points, races, wins, podiums, poles, **Duel wins**, fastest Duel laps, best finish and **best qualifying** (all derived from published data), a **Form** strip for the last five races, race history, and a lightweight **Head-to-head** built on the same `driverStats()` function. The default driver is the championship leader.
- **Calendar:** Completed (with winner), Current race week (strongest emphasis), Upcoming, and "No result published" for past rounds without a classification. Filters: All / Remaining / Completed. ICS export is kept, and dates cannot shift under UTC.
- **Noticeboard:** one feed of official notices and steward decisions, sorted by real `created` time (HKT), with OFFICIAL / STEWARDING filters. Stewarding items link back to their round.

## 10. Admin
- **Dashboard = round control centre:** round selector, stage timeline, countdown, and quick actions deep-linked with `?round=N`. Publication status covers Event, Qualifying, Duel (complete, in progress with k/n matches, or "needs republishing"), Race, Stewarding, Championship and Media (x/6). A Pending panel shows guest submissions and bracket integrity. It only reads state; editing stays in the specialist editors.
- **Publish impact previews:**
  - **Race:** winner, driver count, points awarded, fastest Duel lap, and the top-five WDC **after** publishing with deltas and position changes. This is calculated by applying the draft and running the shared `calculateStandings`.
  - **Qualifying:** pole, seeds, and a warning when a published Duel will need republishing.
  - **Duel:** matches decided, winner and fastest lap.
  - Every preview has "Keep editing" and a specific confirm label ("Replace official result").
- Destructive actions use a distinct danger style. Steward decisions show their round and time.

## 11. Media Centre
- A round selector shows readiness for every round, and each card shows ready or not published.
- Preview is per graphic or all at once, with progress, per-graphic errors and retry. Blob URLs are managed per graphic.
- **Download all** triggers the browser downloads in sequence with no ZIP library. It only includes available graphics, and the page explains how to allow multiple downloads.
- New **Round Recap** graphic (pole, Duel winner, race winner, fastest Duel lap, championship leader after the round). It is available only once the race is published; missing items read "Not published".
- WDC/WCC graphics now say "AFTER ROUND 08 · N PUBLISHED ROUNDS". Filenames are zero-padded (`RLS1-S1-R08-wdc.png`).
- Verified in real Chromium: six PNGs at fixed widths (1200/1500px), independent of the viewport, with long names inside the canvas bounds.

## 12. Accessibility
axe-core (WCAG 2.0/2.1 A/AA plus best practice) found **0 violations on 23 scanned views**: every public page at desktop and phone, and login, dashboard, media, results/qualifying editors, Duel editor, events, stewarding, publishing, standings, drivers and submissions. It flagged 11 rule violations before I fixed them: contrast, a link distinguishable only by colour, a decorative watermark exposed as text, duplicate landmark names, heading order, an unlabeled combobox toggle and an empty header.

Keyboard checks passed:
- skip link to focused `<main>`
- menu toggle and focus on navigation
- ARIA tabs with manual activation
- dialog focus trap, Escape and focus return
- visible focus rings

Countdown seconds are `aria-hidden`, with a static screen-reader description. Scrollable tables are labelled, focusable regions (WCAG 2.1.1).

## 13. Performance (built Workers, Chromium, 375px, 4× CPU throttle, median of 3)

| Page | Metric | Before | After |
|---|---|---|---|
| All public pages | JS transferred | 618 KB | 575 KB |
| All public pages | CSS transferred | 215 KB | 98 KB |
| Home | LCP | ~800 ms | ~212 ms |
| Home | CLS | 0.20 | 0.009 |
| Home | Idle main-thread per 10 s | 179 ms | 53 ms |
| Round | LCP | ~804 ms | ~260 ms |
| Round | CLS | 0.67 | 0.00 |
| Round | Idle scripting per 10 s | 197 ms | 5 ms |

- Before is `/#round-8`; after is `/rounds/8`.
- Admin-only code is in its own chunk.
- Derived standings and summaries are memoised.
- LCP was measured on localhost, so compare the before/after ratio, not the absolute numbers.

## 14. Security findings
- Fixed A1 and A2 (§3). Added a shared `lib/http.ts` for no-store JSON, same-origin checks, request references and safe server logging (route, reference and truncated error class only; never bodies, cookies or keys). 5xx responses give a reference number, not technical detail.
- Re-verified (tests pass):
  - server-side authorisation on every mutation and protected page
  - Origin checks, including form login and logout
  - body limits (413)
  - public/private separation with an organiser cookie present
  - `userId` and IP hashes never returned
  - unexpected JSON fields ignored
  - parameter-bound SQL, including the new raw guarded statements
  - `no-store` on `/api/*` and `/admin*`
  - no client source maps in `dist/client`
  - sitemap and robots exclude admin and API
- Removed `chatgpt-auth.ts`, which trusted incoming identity headers.
- Session model (Phase 35): the eight-hour stateless HMAC session is **unchanged**. Real per-session revocation would need new server state (a table or KV). I did not add a fake version; rotating `LEAGUE_ADMIN_KEY` still revokes all sessions.

## 15. Reliability and data integrity
- **Atomic Duel publication (Phase 19):** the Duel insert and update now run as **single guarded SQL statements**. They write only if the qualifying row the Duel was validated against still has the same body (or, for archive-seeded rounds, if no D1 qualifying row has appeared since). A lost race returns `409`, not a stale write. Read-time validation still marks any mismatched Duel as "needs republishing". Singleton first-publication races now return `409` instead of `503` (`ON CONFLICT DO NOTHING` on deterministic ids).
- Qualifying republication deliberately does **not** delete the Duel. It stays visible as "needs review", which the admin dashboard surfaces, and no organiser data is lost.
- The clock is unchanged: offset, latency compensation, `performance.now` anchoring, fallback, retry, focus/visibility resync, and one shared interval.

## 16. SEO
Every route has its own title, description and canonical URL, and there is per-round metadata (e.g. "RLS1 Round 06 — Monaco | Qualifying, Duel & Race"). Rounds are server-rendered. Added `og:locale` and `colorScheme`. The sitemap has 8 sections and 24 rounds. Invalid rounds return 404. Social previews use the static branded OG image. Per-round OG images would need server-side canvas rendering, which isn't available on Workers without an added renderer, so I didn't add them.

## 17. Testing improvements
- `racing.mjs`: stage states at the 21:00 boundary, partial Duel, SSR-safe labels, round summaries, driver stats, the Shawn=Atlegang identity, leader-through-round, countdown formatting, announced start, media readiness, and a spectator-only check on the new public modules.
- `result-png.mjs`: recap and through-round graphics within bounds.
- New `hardening-http.py`: form login (303, fixed redirects, no key in URL, cross-origin 403), homepage frame protection, HSTS/COOP/form-action, public routes, 404s, metadata, sitemap scope, and the guarded archive-seeded Duel write with a duplicate-publication 409.
- New `e2e-smoke.mjs`: public pages at 375/768/1440 with no overflow or console errors, legacy links and history, organiser login, dashboard, real PNG rendering and logout. It is read-only, localhost-only, and uses an existing Playwright install rather than adding a dependency.

## 18. Dependencies
- **Removed** (unused): `recharts`, `date-fns`, `cmdk`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `@shadcn/react`. The lockfile lost 70 entries, with **0 added and 0 versions changed**.
- `npm audit`: 10 entries (6 high, 4 moderate, 0 critical), identical to the 14 Sep release gate. All are build or dev tooling: Wrangler, Miniflare, sharp, esbuild, drizzle-kit, and `image-size` read by vinext at build time. None is reachable from production request input.
- Upstream fixes now exist (`@cloudflare/vite-plugin@1.58.0`, `vinext@1.0.0-beta.12`), but I did **not** apply them. They replace the Worker build toolchain or jump a pre-1.0 framework six betas, and can only be validated against your Cloudflare build. Do it as a separate upgrade PR with a preview deploy.

## 19. Files changed
- **New:**
  - public: `league-app.tsx`, `round-view.tsx`, `race-card.tsx`, `calendar-view.tsx`, `drivers-view.tsx`, `noticeboard.tsx`, `stage-timeline.tsx`
  - shared logic: `race-week.ts`, `site.ts`, `lib/http.ts`, `ui.css`
  - admin: `admin/ops.tsx`
  - route pages: `rounds/[round]`, `results`, `championship`, `calendar`, `drivers`, `noticeboard`, `videos`, `paddock`
  - repo and tests: `.gitignore`, `.oxlintrc.json`, `tests/hardening-http.py`, `tests/e2e-smoke.mjs`, this report
- **Removed:** `season-views.tsx` (split up), `png-export.tsx`, `chatgpt-auth.ts`, the duplicate `admin/section/page.tsx` route (the screen helper moved to `admin/admin-screen.tsx`), `hooks/use-mobile.ts`, and 51 unused `components/ui/*`.
- **Modified:** session and entries APIs, clock hook, dashboard, championship, qualifying and Duel UI, editors, media, PNG renderers, layout, SEO files, CSS, tests and README.

## 20. Schema and data changes
**None.** There is no migration. Stored title formats and ids are unchanged. The archive fixture comparison passes.

## 21. Historical regression
The archive deep-equals the fixture. WDC is **122/70/55/47/42/22/8/6** and WCC is **192/89/40/37/14**. Winter: 4 wins, 5 podiums, 6 poles. Michell is Mercedes AMG on the roster (Noir Étoile for R1–5 history). Qualifying and Duel seeds (P1v8, P4v5, P2v7, P3v6), progression rules, points isolation from penalties, and the event schedule are all unchanged.

## 22. Commands run (all pass)
- `npx tsc --noEmit`
- `npm run lint` (0 findings)
- `node tests/racing.mjs`
- `node tests/admin-session.mjs`
- `node tests/result-png.mjs`
- `node tests/clock.mjs`
- `npm run build`
- `python3 tests/admin-http.py` · `duel-http.py` · `security-http.py` · `hardening-http.py` (local key file)
- `node tests/e2e-smoke.mjs`
- a responsive sweep of **161 page/width combinations**: 23 public and admin pages × 375/430/768/1024/1280/1440/1920, ending with 0 overflow and 0 console errors after fixes
- axe-core on 23 views
- the before/after performance harness on both built Workers

## 23. Deliberately not implemented
- ZIP "Download all": it needs a dependency, so it uses sequential downloads instead.
- Per-round OG images: they need runtime rendering.
- Session revocation: it needs new server state (§14).
- Individual accounts.
- A System Status panel: its information is already in the dashboard, and build metadata isn't exposed to the Worker.
- Season JSON export: D1 backups are the right tool, and an export endpoint adds surface for little gain.
- Toolchain upgrades (§18).
- The old `.admin`-era CSS in `globals.css`/`polish.css` was pruned, not rewritten; the new token layer overrides it.

## 24. Remaining limitations
- Only Chromium was tested; WebKit and Firefox engines weren't available, so Safari download and `<select>` styling need a manual check.
- The league-owner data questions below.
- The pre-existing Cloudflare release gates still apply: edge rate limits, cache-bypass rules, organiser-key rotation and a preview deployment.

## 25. Data-owner questions (not changed)
1. `season.ts` ignores the literal dates in its schedule list and computes weekly dates from 29 Jul. So R19–R24 run from 2 Dec 2026 to 6 Jan 2027, although the list shows 2 Dec (four rounds sharing it) and 6 Dec. The public site reflects the computed dates, as it did before.
2. The canonical name is "AllenRambeni" in standings and "Allen Rambeni" in classifications.

## 26. Recommended roadmap
1. Preview-deploy this branch and run `hardening-http`/`e2e-smoke` logic against staging. Apply the edge rules from the 14 Sep gate.
2. Do a separate toolchain upgrade PR (§18).
3. Settle the schedule and name questions (§25).
4. If revocable sessions matter, add a small `sessions` table and check it in `authenticated()`.
5. Multi-season: add a `season` column (default 1, backward compatible) and move `schedule`/`archive` into per-season modules keyed by `SEASON`. Generalise `roundTitle`, the Duel title regex and `validateOfficial`'s 1–24 range, then `/seasons/:n/rounds/:r` routes. Display strings are already centralised on `SEASON`.
