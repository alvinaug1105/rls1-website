# RLS1 final release gate — 14 September 2026

**NOT READY FOR PRODUCTION**

Local code/regression gates pass. The outstanding blockers are deployment evidence: no Cloudflare staging URL was supplied, no account settings were applied or verified, and organiser-key rotation is unconfirmed. No production data was touched. No features or redesign were added.

## Dependencies
Re-ran npm audit. A normal targeted npm update found no upgrades because parent packages pin versions. Applied compatible same-major overrides for ws 8.18.0 → 8.21.0 and undici 7.24.8 → 7.29.1. These patch/minor updates remove their advisories; the fresh Vite/Miniflare server, integrations and production build pass. No force audit fix, major upgrade, or pre-1.0 incompatible minor override was used.

Final npm audit: 10 affected package entries (6 High, 4 Moderate; 0 Critical), representing six underlying advisories. Package severity may inherit a dependency's advisory. This is not ten independently exploitable production issues. See the complete per-advisory matrix below.

Evidence: npm ls dependency trees; vinext metadata-route-build-data.js reads filesystem build metadata via image-size; its importer is the RSC manifest builder. sharp is pulled only by Miniflare's local image transformation emulator. esbuild affected copies belong to Drizzle tooling and Wrangler. Application code does not import these parsers; built Worker JS scans found no sharp/undici/WebSocketServer/imageSize implementation references. Production runs Cloudflare Workers, not the local Vite/Miniflare server. Guest videos are HTTPS links, not uploaded image bytes, and official PNGs use browser canvas. These are code-path findings for this release, not a guarantee about future features or the entire upstream framework.

Residual dependency risks are acceptable for this small deployment **provided** development/inspector ports stay local, CI only builds trusted source/assets, and dependency scans continue. Do not run builds from unreviewed pull requests with production credentials. No currently demonstrated public production input path reaches the six remaining vulnerable operations. No dependency-count-zero requirement is imposed.

## Exact Cloudflare configuration — required, NOT applied

### Plan and hostname prerequisites
Use the Cloudflare zone serving the RLS1 hostname. Replace `YOUR_RLS_HOST` below with its actual hostname. Zone rules do not automatically protect a different workers.dev hostname. If using a custom domain for these controls, verify alternate workers.dev/preview entry points cannot bypass the intended protections; disable or separately protect them after checking routing.

Current Cloudflare documentation lists Method matching for Business and above. Free has one rate rule and 10-second counting/block periods; Pro supports minute periods but not Method matching in rate expressions. Therefore the exact two POST-only rules below require the documented Business-or-higher capabilities (or an equivalent supported account entitlement). Do not claim a Free-plan approximation satisfies this gate. No plan purchase or routing change was performed. [Rate-limit availability](https://developers.cloudflare.com/waf/rate-limiting-rules/), [Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

### A. Admin login
Cloudflare dashboard → target zone → Security rules → Create rule → Rate limiting rule.

Name: `RLS1 admin login`

```text
(http.host eq "YOUR_RLS_HOST" and http.request.method eq "POST" and http.request.uri.path eq "/api/admin/session")
```

- Counting characteristic: source IP.
- Count all requests matching this expression, not only failed logins.
- Requests: 10; period: 60 seconds.
- Action: Block; duration/mitigation timeout: 60 seconds.
- Do not select a challenge action as a substitute for the requested temporary block.
- If available, return HTTP 429 for the custom block response.

### B. Guest submission outer burst protection
Name: `RLS1 entries burst`

```text
(http.host eq "YOUR_RLS_HOST" and http.request.method eq "POST" and http.request.uri.path eq "/api/entries")
```

Use source IP, 10 matching requests per 60 seconds, Block for 60 seconds. This also limits organiser POSTs to the shared endpoint; do not exempt requests based solely on a forgeable header or cookie presence. Keep the application's five-per-hour guest check and pending moderation. Edge counters can briefly overshoot and are not a globally exact quota. [Rule creation](https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/).

### HTTPS and cache
- Zone → SSL/TLS → Edge Certificates → Always Use HTTPS: On. Use valid TLS; where a separate origin exists, use Full (strict), not Flexible. Verify the HTTP URL redirects to HTTPS without sending credentials over HTTP. [HTTPS setting](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/).
- Zone → Caching → Cache Rules → Create rule; choose Bypass cache for:

```text
(http.host eq "YOUR_RLS_HOST" and (starts_with(http.request.uri.path, "/admin") or starts_with(http.request.uri.path, "/api/")))
```

This explicitly covers `/admin*`, `/api/*` and `/api/time`. Place this bypass after other matching cache rules so later eligibility overrides cannot restore caching. Remove/exclude these paths from any Cache Everything rule. Preserve application `Cache-Control: no-store` and never force an edge/browser TTL for these routes. Inspect Workers Cache API/custom caching code too if added later. [Bypass cache](https://developers.cloudflare.com/cache/how-to/cache-rules/create-dashboard/), [rule priority](https://developers.cloudflare.com/cache/how-to/cache-rules/order/).

## Organiser-key rotation — not performed or confirmed
No replacement key was generated, printed or stored in this pass.

1. In Cloudflare Workers & Pages select the intended RLS1 Worker/environment; use a separate staging Worker and D1 database for verification.
2. Open Settings → Variables and Secrets → Edit. Set `LEAGUE_ADMIN_KEY` with type **Secret**, entering the replacement privately in Cloudflare. Do not change it to a plaintext variable.
3. Deploy/apply that configuration to the intended environment. Ensure no old Worker version continues receiving traffic with the old secret; avoid a mixed-version rollout for rotation.
4. Sign in with the replacement on HTTPS. Verify the old key fails and an existing old session cannot access `/api/entries?admin=1`. Verify the old x-league-key compatibility credential also fails.
5. Once all traffic uses the replacement secret, old credentials and signed sessions become invalid: both key comparison and session HMAC verification use LEAGUE_ADMIN_KEY. This is verified in local key-rotation tests, not confirmed against your Cloudflare account.
6. Never commit the replacement to GitHub, frontend code, committed .env files, ZIPs or chat. Do not enable request-body logging on the login endpoint or share unredacted HAR captures.

[Cloudflare secret configuration](https://developers.cloudflare.com/workers/configuration/secrets/).

## Preview/staging verification gate
No preview URL supplied; **all Cloudflare deployment checks below remain pending**. Local tests are evidence about code only. No publishing test may run against the production D1 database.

| Check | Local evidence | Cloudflare preview |
|---|---|---|
| HTTPS and HTTP redirect | Local HTTP intentionally used | Pending |
| Secure, HttpOnly, SameSite=Strict, Path=/ cookie | HttpOnly/Strict/Path and HTTPS condition inspected | Pending real HTTPS cookie |
| Login/logout; old session/key after rotation | Unit + HTTP login/logout pass | Pending rotation/deployment |
| Unauthenticated admin and Media Centre | Login gate shown; private UI withheld | Pending |
| Protected API rejection | 401/403 tested | Pending |
| Hostile/missing Origin | Rejected in HTTP tests | Pending |
| Public/admin separation | Default/public GET remains public under admin cookie | Pending |
| Private cache leakage | no-store headers tested locally | Pending edge/browser cache verification |
| CSP/frame-ancestors, X-Frame-Options, nosniff | Header checks pass | Pending |
| Referrer-Policy, Permissions-Policy | Configured in next.config.ts | Pending |
| /api/time no-store, server-time clock | Endpoint and skew/latency tests pass | Pending edge caching/network |
| Wednesday 21:00 HKT | Pure-clock boundary tests pass | Pending deployed clock agreement; do not change real schedule for testing |
| Qualifying/Duel/Race publishing | Disposable local HTTP fixtures pass | Pending separate staging-D1 fixtures |
| Credential exposure | Prior exact local key/source/ZIP scans clean | Pending preview bundle/source inspection |

The login request necessarily transmits the organiser key to the same-origin HTTPS session endpoint. “No key in network” means no unintended URL, response, third-party request or public bundle leakage; it cannot mean removing the intended credential from its login POST body. Inspect privately and never publish a HAR containing it.

Unauthenticated `/admin` intentionally returns a login page (HTTP 200), not protected admin content; protected APIs reject. This is the expected auth-gate behavior.

## Residual application risks and acceptance assessment

| Risk | Severity | Acceptable for current small trusted-organiser deployment? |
|---|---|---|
| Copied stateless token survives logout until expiry/key rotation | Medium | Conditionally yes: trusted devices, HTTPS, eight-hour expiry and immediate key rotation if compromise suspected |
| No per-session server-side revocation | Medium | Yes under the same small shared-organiser model; rotate the key to revoke all sessions |
| Guest rate check is not atomic/distributed exact quota | Low/Medium | Yes with pending moderation plus the verified edge burst rule; not suitable as billing/security quota |
| Qualifying/Duel publication is not one atomic multi-record transaction | Medium integrity | Yes with one organiser publishing a round at a time, no concurrent qualifying/Duel edits, and checking the published bracket afterward |

These are engineering acceptance recommendations, not a claim that you have approved the risks or that operational controls are installed. No session redesign was made.

## Regression
All requested code commands passed after the dependency overrides:

```text
npx tsc --noEmit
npm run lint
node tests/racing.mjs
node tests/admin-session.mjs
node tests/result-png.mjs
node tests/clock.mjs
npm run build
RLS_TEST_BASE=http://localhost:3002 python3 tests/admin-http.py --key-file ../../outputs/organiser-access.txt
RLS_TEST_BASE=http://localhost:3002 python3 tests/duel-http.py --key-file ../../outputs/organiser-access.txt
RLS_TEST_BASE=http://localhost:3002 python3 tests/security-http.py --key-file ../../outputs/organiser-access.txt
```

A fresh local preview on port 3002 loaded the updated dependencies. Existing HTTP test scripts were extended only to permit this local port. Tests clean up their disposable records. Archive fixture comparisons pass; WDC 122/70/55/47/42/22/8/6 and WCC 192/89/40/37/14 unchanged. No production data changed.

## Remaining release blockers
- Supply an isolated Cloudflare preview URL and verify the deployed checklist.
- Apply/verify the exact edge rules on an eligible hostname/plan, or explicitly decide an alternative release policy; no automatic plan/rule change occurred.
- Confirm organiser-key rotation and old-credential rejection.

Dependency residuals and the four stated application limitations are conditionally acceptable as above. They do not independently require a redesign or a zero-audit-count release. The unresolved deployment gates prevent production sign-off.

## Complete remaining dependency matrix

### @cloudflare/vite-plugin — high

- Inherited advisory through `miniflare` (see its row).
- Inherited advisory through `wrangler` (see its row).

Assessment: Development/build tooling only in the inspected dependency and bundle paths. Keep dev ports private; do not process untrusted local input. Parent pins prevent an ordinary compatible update. Accepted with these constraints.

### @esbuild-kit/core-utils — moderate

- Inherited advisory through `esbuild` (see its row).

Assessment: Development/build tooling only in the inspected dependency and bundle paths. Keep dev ports private; do not process untrusted local input. Parent pins prevent an ordinary compatible update. Accepted with these constraints.

### @esbuild-kit/esm-loader — moderate

- Inherited advisory through `@esbuild-kit/core-utils` (see its row).

Assessment: Development/build tooling only in the inspected dependency and bundle paths. Keep dev ports private; do not process untrusted local input. Parent pins prevent an ordinary compatible update. Accepted with these constraints.

### drizzle-kit — moderate

- Inherited advisory through `@esbuild-kit/esm-loader` (see its row).

Assessment: Development/build tooling only in the inspected dependency and bundle paths. Keep dev ports private; do not process untrusted local input. Parent pins prevent an ordinary compatible update. Accepted with these constraints.

### esbuild — moderate

- [esbuild enables any website to send any requests to the development server and read the response](https://github.com/advisories/GHSA-67mh-4wv8-2f99); affected range `<=0.24.2`.
- [esbuild allows arbitrary file read when running the development server on Windows](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr); affected range `>=0.27.3 <0.28.1`.

Assessment: Development/build tooling only in the inspected dependency and bundle paths. Keep dev ports private; do not process untrusted local input. Parent pins prevent an ordinary compatible update. Accepted with these constraints.

### image-size — high

- [image-size: ICNS parser allows denial of service through an infinite loop](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr); affected range `<=2.0.2`.
- [image-size: JXL and HEIF parsers allow denial of service through infinite loops](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq); affected range `<=2.0.2`.

Assessment: Build-time trusted repository metadata parsing; not public request bytes. Keep repository images trusted; no patched 2.x registry release was available. Accepted with these constraints.

### miniflare — high

- Inherited advisory through `sharp` (see its row).

Assessment: Development/build tooling only in the inspected dependency and bundle paths. Keep dev ports private; do not process untrusted local input. Parent pins prevent an ordinary compatible update. Accepted with these constraints.

### sharp — high

- [sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591](https://github.com/advisories/GHSA-f88m-g3jw-g9cj); affected range `<0.35.0`.
- [sharp: Vulnerabilities in libheif: GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c); affected range `<0.35.4`.

Assessment: Development/build tooling only in the inspected dependency and bundle paths. Keep dev ports private; do not process untrusted local input. Parent pins prevent an ordinary compatible update. Accepted with these constraints.

### vinext — high

- Inherited advisory through `image-size` (see its row).

Assessment: Build-time trusted repository metadata parsing; not public request bytes. Keep repository images trusted; no patched 2.x registry release was available. Accepted with these constraints.

### wrangler — high

- Inherited advisory through `esbuild` (see its row).
- Inherited advisory through `miniflare` (see its row).

Assessment: Development/build tooling only in the inspected dependency and bundle paths. Keep dev ports private; do not process untrusted local input. Parent pins prevent an ordinary compatible update. Accepted with these constraints.

