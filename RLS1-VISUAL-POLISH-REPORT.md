# RLS1 visual polish and championship PNG update

## 1. Audit findings
The existing interface had inconsistent card/table emphasis, excessive introduction space, horizontally crowded mobile navigation, weak championship podium emphasis and unclear Duel connections. Authentication, race-week logic and published archive handling were retained.

## 2. Files changed in this pass
New: app/polish.css, app/status-badge.tsx.
Updated: app/layout.tsx, app/page.tsx, app/dashboard.tsx, app/championship.tsx, app/result-png.ts, app/duel-ui.tsx, app/season-views.tsx, app/league.tsx, app/admin/portal.tsx, tests/result-png.mjs.
The update archive also contains cumulative earlier application, API, library and test changes needed by these files.

## 3. Design system
Shared graphite surfaces, restrained gold highlights, consistent borders, spacing, typography, controls and podium emphasis. Existing RLS1 identity remains intact.

## 4. Homepage
Stronger current-event country heading and stage badge, clearer Hong Kong league-time caption and championship numbers. Existing Wednesday–Sunday selection and published-result precedence are preserved.

## 5. Navigation
Mobile navigation opens as a labelled menu and closes on section selection. Desktop navigation wraps without the previous fixed-height collision.

## 6. Results
Consistent table headings, numeric alignment, team wrapping and podium accents. Race and qualifying data sources remain unchanged.

## 7. Duel
Desktop bracket columns receive connection indicators; mobile uses stacked cards. Winners have a checkmark and highlight; eliminated drivers are visually subdued. The exported bracket has stage connectors and retains winner/fastest-lap details.

## 8. Championships
WDC and WCC now have top-three summaries, full standings and matching Save WDC PNG / Save WCC PNG buttons. Both table and export use the existing calculated standings, without introducing a second points calculation.

## 9. Calendar
Shared stage badges and clearer selected-round emphasis. No invented event times or historical schedule edits.

## 10. Drivers and noticeboard
Shared card/table styling improves consistency and wrapping. Official notices are labelled Race Control. Uneven lower-grid card heights were corrected.

## 11. Administration
Shared surfaces, form controls and headings are refined; login now reads League control centre. Existing authentication, permissions, previews and publication flows remain intact.

## 12. PNG exports
Qualifying, Duel, Race Result, WDC and WCC use a consistent branded canvas system. Championship exports include full names, points, gaps and wins/podiums. Images use fixed high-resolution widths independent of the device viewport, with height expanding for content. Generation feedback, preview and download remain available. No extra rendering dependency was added.

## 13. Responsive checks
All eight public sections were checked at 375, 430, 768, 1024 and 1440 pixels with no page-wide horizontal overflow. Nine loaded admin modules were checked at the same widths: Events, Qualifying, Duel, Race results, Stewarding, Standings, Drivers & teams, Guest submissions and Publishing desk. Login also fits these widths. This is an overflow audit, not a claim that every possible form state or dialog was visually exercised.

## 14. Accessibility
Visible focus treatment, 44-pixel primary control targets, labelled mobile menu state, reduced-motion support and text/symbol stage and winner indicators. A full screen-reader and formal contrast audit remains outside this pass.

## 15. Performance and data safety
CSS and existing canvas rendering are reused; no new package dependency, database migration, seed reset or production write. Existing race records, auth and standings rules are preserved. Local integration fixtures were cleaned up by the tests.

## 16. Verification and screenshots
Passed: TypeScript, lint, racing/archive regression tests, admin-session tests, PNG layout tests including long driver/team names, admin HTTP integration, Duel HTTP integration and production build. Browser preview checks covered WDC on desktop and WCC on mobile. Before/after visual screenshots were inspected inline during the work; separate screenshot files are not bundled. Synthetic long-name layout checks use a canvas measurement mock, so they supplement rather than replace browser inspection.

## 17. Limitations and next steps
No production deployment was performed. Safari/iOS and every expanded admin form state were not exhaustively tested. Optional portrait/landscape presets are not added: the image expands to preserve the full result. Upload the extracted archive contents into the existing GitHub repository root, preserving folder structure. Keep existing Cloudflare/package/Vite configuration and secrets. The archive intentionally excludes credentials, environment files, hosting configuration and database files. Review the Cloudflare build after GitHub updates, then check the live site.
