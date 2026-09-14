# RLS1 hardening review — 13 September 2026

**OVERALL SECURITY VERDICT: NOT READY FOR PRODUCTION sign-off.**

The implemented application fixes and regression tests pass. This is not a clean dependency audit or a complete penetration-test certification. Remaining dependency exposure, edge rate limiting, copied-token revocation limitations and the earlier shared credential's rotation need an explicit operational decision before declaring this version stable. No production deployment or production data changes were made.

## 1–4. Findings, severity, fixes and remaining risks

| Finding | Severity | Outcome |
|---|---|---|
| Installed React Server Components version affected by server-function DoS | High | Patched React, React DOM and react-server-dom-webpack from 19.2.6 to 19.2.8; build/regressions pass |
| Vite Windows development-server path advisory | High upstream; limited local exposure here | Patched Vite 8.0.13 to 8.0.16 |
| Default entries GET changed data visibility when organiser cookie existed | Medium | GET now requires explicit `admin=1` for private records; default and `public=1` always public |
| Body limits applied after full read; moderation body unbounded | Medium | Streaming byte limits: entries POST 50,000 bytes, moderation 4,096, session login 5,000; 413 responses tested |
| Framing protections absent | Medium | CSP frame-ancestors none plus X-Frame-Options DENY; response headers verified |
| Duel validation catch could echo database exception text | Low | Generic safe validation error response |
| Device-clock-dependent session timing | Reliability | Shared server-synchronised monotonic clock with latency estimate, retry and fallback |
| Copied session remains valid after logout | Medium residual | Existing stateless bearer design retained; cookie deletion does not revoke stolen copies. Key rotation revokes all sessions; individual revocation requires additional server state |
| No distributed login throttling | Medium residual | Edge rule recommendation below; not silently replaced with ineffective per-isolate memory counters |
| Concurrent guest requests can exceed count-then-insert rate limit | Low/Medium residual | Existing D1-backed five-per-hour check retained; not an atomic quota |
| Duel qualifying dependency can change between validation and write | Medium integrity residual | Existing stale validation and later publishedDuel invalidation retained; multi-record atomic publication is not implemented |

No critical application issue was established. Severity labels do not mean every upstream issue is reachable in this application.

## 5. Authentication
LEAGUE_ADMIN_KEY is read in the server-only Cloudflare auth helper. Matching hashes both values and compares every digest byte. No raw key is stored by application localStorage/sessionStorage logic. Login redirects are fixed internal paths. The unused ChatGPT helper does not grant organiser privileges; its return path is restricted to the same origin.

Compatibility `x-league-key` is accepted by `admin(req)` for entries POST and PATCH and explicit `GET /api/entries?admin=1`. It is not accepted by protected page rendering or session GET, which require the signed cookie. State-changing raw-key requests still need same-origin Origin. Default/public GET no longer elevates with either credential.

The organiser credential previously appeared in the conversation. This review cannot establish whether that value was subsequently rotated in production. Rotate it if it remains active; never upload organiser-access.txt or .dev.vars.

## 6. Sessions and cookies
HMAC-SHA256 uses Web Crypto, random UUID nonce, purpose marker and eight-hour expiry. Login mints a fresh session rather than promoting supplied cookie data. Tests cover tampering, malformed tokens, expiry, future timestamp, key rotation and nonce uniqueness. Cookie is HttpOnly, SameSite=Strict, Path=/, Max-Age=28800 and Secure when request URL is HTTPS. Cloudflare HTTPS must be the deployment entry point. Browser logout and direct/API access after logout were checked. A copied valid bearer token remains valid until expiry/key rotation; this is expressly not server-side logout revocation. Admin polling detects expiry and mutations independently authenticate.

## 7. CSRF and CORS
All application mutations compare Origin with request origin, including login/logout. Empty and hostile origins reject. No permissive credentialed CORS header is introduced. Non-browser clients can forge Origin, so authentication remains necessary; Origin is a CSRF defence, not an identity credential.

## 8. XSS and inputs
User text is passed as React text nodes or canvas fillText, not parsed as HTML. SQL-like and script-like strings were stored in a disposable pending story, remained exact text and could not self-approve through unexpected fields. This test verifies storage and filtering, not execution of every payload in every browser view. The sole dangerouslySetInnerHTML search hit is the unused shared chart style generator; no league user content feeds it. Video submission validation requires HTTPS URLs. Existing imported malformed legacy video JSON could still produce a rendering error; no archive data was rewritten.

## 9. Database/API
Drizzle queries use parameter binding for IDs and values. No dynamic user SQL was found. Public fields are explicitly selected; userId is not returned. Guest approved/admin/published fields are ignored. Official kinds require organiser access. Moderation actions require auth and Origin. Error responses avoid stack traces; request/body boundaries are tested. Guest rate limiting is persisted via D1 counts but shared NATs, rotating IPs and concurrent requests limit its effectiveness.

## 10. Public/admin separation
Default GET and explicit public GET were tested with an organiser session while a hidden fixture existed: neither returned it or indicated admin scope. Explicit admin GET requires credentials. Unknown record IDs cannot bypass PATCH auth. Public responses still intentionally include published entry IDs, author, created and approved fields needed by the app, but not guest IP hashes or userId.

## 11. Media/PNG
/admin/media shares the server auth gate. Graphics derive from approved qualifying/race records and validated published Duel; championship calculations filter approved race entries. Pending/rejected stories are not graphic inputs. Filenames use bounded round numbers and fixed graphic identifiers. Canvas interprets text as text, and PNG previews use generated data URLs. Renderer tests cover all five graphics and long names. No media upload/path-writing endpoint exists.

## 12. Duel/result integrity
Existing server validation covers seeds, eligible winners, duplicate drivers, attempts, lap numbers and qualifying-body dependency. Explicit points remain authoritative. Unknown driver names are allowed for organisers subject to length and duplicate validation; no roster whitelist was introduced. Event/race optimistic expected-body tests now cover stale writes; Duel stale tests pass. Steward decisions are append-only in this UI, so there is no edit-version replacement path. Historical confirmations/unchanged preview checks remain frontend safeguards, not a second permission boundary. Multi-record atomic qualifying/Duel concurrency remains a limitation above.

## 13. Cache and security headers
Admin routes return private no-store; APIs return no-store. Verified nosniff, frame protections and admin no-store on the new preview server. Referrer-Policy is strict-origin-when-cross-origin; camera/microphone/geolocation are disabled. CSP only restricts frame ancestors, objects and base URI; this is deliberately not claimed as a full script-src XSS CSP. robots excludes admin/API and sitemap contains only the public homepage; neither is relied on for auth.

## 14–15. Trusted time and reliability
GET /api/time returns only absolute UTC milliseconds with no-store. All existing useClock callers now subscribe to one shared clock. Sync adjusts for half round-trip time, anchors to performance.now and does not alter the system clock. One tick interval is shared across subscribers. Resync occurs every five minutes, or every minute while uninitialised; focus/visibility resync is throttled to at least one minute. Request timeout is eight seconds. Failed initial sync falls back to device time; later failures retain the trusted monotonic reference. League dates and labels remain Asia/Hong_Kong. Tests cover correct/±5-minute/±1-hour device clocks, 200ms round trip, 20:59:59/21:00/21:00:01 HKT, failure, resume, retry and interval cleanup. This is a simple latency estimate, not authenticated NTP; trust rests on the same-origin HTTPS server and network asymmetry can leave small error.

## 16. Dependencies
Initial npm audit: 20 affected package nodes (9 high, 11 moderate). After targeted patches: 12 nodes (6 high, 6 moderate), zero critical. These counts include transitive/meta-vulnerabilities, not twelve independent exploitable bugs.

Remaining nodes: @cloudflare/vite-plugin, @esbuild-kit/core-utils, @esbuild-kit/esm-loader, drizzle-kit, esbuild, image-size, miniflare, sharp, undici, vinext, wrangler, ws. image-size currently has no newer registry release; the inspected vinext reference reads build metadata images rather than guest video uploads. Most remaining tooling paths are development/build dependencies. No external SOCKS proxy, Undici cache interceptor or guest image-upload parser was found in application code. That is a reachability assessment, not proof of non-exploitability throughout dependencies. Keep development/inspector servers private. No force audit fix or major upgrade was performed.

React advisory: https://github.com/advisories/GHSA-wx67-qw84-cm4g (patched in 19.2.8). Full before/after audit JSON is included separately.

## 17–18. Tests and commands
Passed:
- npx tsc --noEmit
- npm run lint
- node tests/racing.mjs
- node tests/admin-session.mjs
- node tests/result-png.mjs
- node tests/clock.mjs
- npm run build
- python3 tests/admin-http.py --key-file ../../outputs/organiser-access.txt
- python3 tests/duel-http.py --key-file ../../outputs/organiser-access.txt
- RLS_TEST_BASE=http://localhost:3001 python3 tests/security-http.py --key-file ../../outputs/organiser-access.txt
- RLS_TEST_BASE=http://localhost:3001 python3 tests/duel-http.py --key-file ../../outputs/organiser-access.txt

Dependency review: npm audit --json; npm --cache /tmp/rls-npm-cache audit --json. Audit exits nonzero for the remaining advisories. Targeted installs used --ignore-scripts --save-exact for React packages and --save-dev --save-exact for Vite. No broad lint exclusion added.

The existing port-3000 process could not be restarted under process permissions; a fresh Vite preview on port 3001 verified new headers and patched dependencies. Representative public/admin layouts passed overflow checks at 375/430/768/1024/1440. Browser console findings were third-party extension errors, not application errors. This was not exhaustive manual DevTools storage/network/source inspection or full screen-reader/Safari testing.

## 19. Files changed in this pass
New lib/league-clock.ts, app/league-clock.ts, app/api/time/route.ts, lib/request-body.ts, tests/clock.mjs, tests/security-http.py. Updated app/race-ui.tsx, app/api/entries/route.ts, app/api/admin/session/route.ts, next.config.ts, package.json, package-lock.json, tests/admin-session.mjs, tests/admin-http.py, tests/duel-http.py. Cumulative update archive includes prior required application files.

## 20. Historical regression and secrets
Archive fixture comparison and WDC 122/70/55/47/42/22/8/6 and WCC 192/89/40/37/14 tests passed. No production data or scoring changes. Exact local credential scans found no hits in app/lib/public/tests/dist or existing output ZIPs. ZIP scans also found no organiser-access.txt, .dev.vars or SQLite files. This checks the available local key, not all possible historical/remote credentials. Server source maps can contain server code; never publish dist/server as static public assets. Private local draft results may remain in localStorage by design; auth values are not stored there by app code.

## 21. Recommended Cloudflare settings / release gates
1. Enforce HTTPS; keep Secure cookies and bypass cache for /admin* and /api/*, including /api/time. Do not use Cache Everything on these paths.
2. Add an edge rate-limit rule for POST /api/admin/session: start with 10 requests per IP per minute and a one-minute block; tune against legitimate organiser traffic. This is a recommendation, not an applied rule.
3. Add guest POST /api/entries protection (for example 10 per IP per minute as an outer burst limit), retaining the application's pending moderation and five/hour check. Shared IPs need consideration.
4. Rotate any organiser key still matching one shared in chat; rotation invalidates existing sessions. Do not send the replacement key back in chat.
5. Review remaining upstream advisories and decide whether copied-token revocation and atomic multi-record Duel publication are required before stable sign-off.
6. Upload the patch and dependency lock together, run a Cloudflare preview build and verify HTTPS cookies/headers there before choosing to promote it. No automatic deployment occurred.
