# RLS1 Admin Portal — implementation report

The admin portal is implemented locally at `/admin`. Publishing Desk is one module inside it. The public league site and historical season data remain intact. Production has not been changed.

## 1. Files changed

New files:

- `app/admin/[[...section]]/page.tsx`: server-protected route dispatcher and admin metadata.
- `app/admin/portal.tsx`: login, dashboard, navigation, session checks, logout and unsaved-navigation dialog.
- `app/admin/admin.css`: separate responsive admin styling.
- `app/api/admin/session/route.ts`: sign-in, session check and logout endpoints.
- `lib/admin-session.ts`: signed session creation, expiry verification and credential comparison.
- `lib/organiser-auth.ts`: shared server authentication abstraction.
- `tests/admin-session.mjs` and `tests/admin-http.py`: focused authentication and protected-route tests.

Updated files:

- `app/api/entries/route.ts`: session authorization, explicit public reads/submissions and rejected moderation state.
- `app/league.tsx`: cookie-based admin data loading; public Noticeboard and deadline helper remain, embedded admin/key handling removed.
- `app/page.tsx`: Race Control links to `/admin`; public notices remain available under Noticeboard.
- `app/result-editor.tsx`: dedicated session mode, round deep links, inline row errors, dirty state and historical replacement confirmation.
- `app/event-editor.tsx`: dedicated event/stewarding modes, round deep links, reset and unchanged-save protection.
- `app/publishing-desk.tsx`: publication review, announcement preview and separate moderation views.
- `app/robots.ts`: admin paths excluded from indexing.

The upload ZIP also contains the earlier cumulative application changes, shared utilities, public assets and regression tests so they remain available together. Deployment configuration is intentionally excluded.

## 2. Admin routes added

| Route | Purpose |
|---|---|
| `/admin` | Login when logged out; dashboard when authenticated |
| `/admin/events` | Event date, confirmed start time, status and notes |
| `/admin/qualifying` | Qualifying classification editor |
| `/admin/results` | Finishing order, awarded points and best duel laps |
| `/admin/stewarding` | New decisions and published decisions |
| `/admin/standings` | Read-only championship tables and progression |
| `/admin/drivers` | Read-only roster and historical driver information |
| `/admin/submissions` | Pending, approved and rejected guest content |
| `/admin/publishing` | Published classification review and announcements |

Editor routes support `?round=1` through `?round=24`. Publication review links select the corresponding round. Unknown admin routes return not found. Every supported page checks the session on the server before rendering the portal.

## 3. Authentication flow

1. The login form accepts the existing organiser key with password masking, show/hide, Enter submission, loading and clear errors.
2. The server checks the configured `LEAGUE_ADMIN_KEY` and issues a signed, randomised session token.
3. The session is stored in an HttpOnly, SameSite=Strict cookie, with Secure enabled on HTTPS and an eight-hour lifetime.
4. Successful sign-in opens `/admin`. Refresh preserves the session. No organiser key is stored in localStorage, URLs or exported files.
5. Every protected API operation independently verifies server authorization. Focus/periodic session checks return expired sessions to login.
6. Logout clears the cookie. Rotating the organiser key invalidates existing signatures.

The displayed identity is “Organiser”. Existing `x-league-key` API clients still work; the admin UI no longer sends the raw key on each data request.

## 4. Dashboard and modules

The dashboard shows the real next event, latest published race, championship publication round, pending submission count and module shortcuts. Desktop uses a sidebar; phones use an expandable menu.

Events, qualifying, results and stewarding have separate editors. Unchanged classifications cannot be published; event and decision forms have reset controls. Significant result replacements have an explicit warning and replacement button. Navigation from unsaved forms offers Keep editing or Discard & continue. Browser tab closing/refresh also has a best-effort native warning.

Publishing Desk reviews published classifications and previews announcements. It does not pretend there is a server-side draft queue. Qualifying/race drafts remain browser drafts in the existing editor. Moderation provides previews, approval, rejection and confirmed deletion; rejected content can be reviewed again later.

## 5. Security checks

- Unauthenticated requests cannot publish races, qualifying, events, penalties or announcements, or approve submissions.
- Server-rendered protected routes show only login to unauthenticated visitors; editable records are not rendered first.
- Cookie signatures, expiry and key rotation are enforced server-side.
- State-changing requests require the same origin.
- Admin/public responses are not cached and vary by authentication headers. Public reads explicitly exclude pending and rejected content, even when an organiser is signed in.
- Public community submissions retain guest moderation behavior when an organiser browses the public page.
- Internal user/IP-derived identifiers remain excluded from API responses.
- Existing compare-and-swap stale-edit protection and validation remain in place.
- Export inspection confirms no organiser credential, environment file, database, build output or dependencies are included.

## 6. Existing components reused

`ResultEditor`, `EventEditor`, championship and driver views, classification validation, canonical driver names, team lookup, calendar/event helpers and the existing D1 entries API are reused. Publishing Desk has been refocused around review/moderation rather than retaining its old all-in-one editor tabs.

Public results, qualifying pictures, Discord recaps, calendar/ICS, scoring rules, championship calculations and archive records use their existing components. Penalty publication still does not silently change championship points.

## 7. Tests performed

Passed:

- `npx tsc --noEmit`
- `npm run lint` — no new broad lint exclusions
- `node tests/racing.mjs` — archive preservation, standings, progression, event selection, ICS, lap/position validation and penalty isolation
- `node tests/admin-session.mjs` — valid sessions, expiry boundary, tampering, malformed tokens, rotated keys and credential comparison
- `python3 tests/admin-http.py --key-file <private-local-key-file>` — localhost-only route protection, login/logout, cookie flags, origin enforcement, all official write types and reject/approve/public filtering
- Existing local stale-result and event/penalty integration checks
- `npm run build`

Manual browser flow: logged-out login; incorrect key rejected; correct key accepted; dashboard; refresh persistence; Events, Qualifying, Race Results, Stewarding, Publishing, Moderation, Standings and Drivers; disposable event edit → preview → publish → public round-page verification; logout; direct protected route returns login. Disposable event/story/result records were removed. An invalid qualifying lap displayed a row error; Keep editing preserved the draft; historical replacement preview was verified without publishing the edit, then the test draft was reset.

Representative layouts were visually inspected at 375, 430, 768, 1024 and 1440 pixels. Mobile navigation and internal table scrolling were checked. No application error appeared in the inspected browser error log.

## 8. Limitations

- This is shared organiser access, not individual accounts or an attribution/audit-history system.
- Sessions are stateless. Logout clears this browser's cookie; a copied token would remain valid until expiry or key rotation. Individual session revocation is not implemented.
- No new distributed login-rate limiter was introduced; the deployment can add Cloudflare rate limiting independently.
- Drivers/teams and standings are read-only here. Event names continue to use the existing schedule; supported event overrides are date, start time, status and notes.
- Native close/refresh warnings depend on browser behavior. Explicit admin navigation has its own confirmation dialog.
- Browser coverage is representative, not every control at every width or a formal accessibility audit. Existing exports were preserved and covered by prior browser/regression testing, not all repeated in this pass.
- The build was verified locally with the existing development configuration. The live Cloudflare deployment was not changed or tested in this pass.

## 9. Future authentication upgrade

Replace the shared key with individual organiser accounts through an established identity provider, with explicit organiser allowlists/roles, MFA, revocable server sessions and an audit trail. Keep the centralized server authorization abstraction so that upgrade can replace the credential/session mechanism without rewriting the editors. Discord OAuth was not introduced in this pass.

## Upload instructions

1. Extract `rls1-admin-portal-update.zip`.
2. Upload its `app`, `lib`, `public` and `tests` folders to the **root of your existing GitHub repository**, preserving folder names and replacing the corresponding files. Include `.oxlintrc.json` if maintaining repository checks.
3. Keep your current working Vite/Worker configuration, D1 binding and `LEAGUE_ADMIN_KEY` runtime secret. Do not upload the private organiser-access file. No database migration or dependency change is required.
4. Commit and let Cloudflare build. Open your live site's `/admin` and sign in with the existing organiser key.

This ZIP is an application update for the existing repository, not a replacement deployment configuration or a standalone project.
