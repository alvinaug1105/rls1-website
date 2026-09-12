# RLS1 PNG exports update

All result views now have Save Qualifying PNG, Save Duel PNG and Save Race Result PNG controls. Generate a preview, then choose Download PNG; on phones the preview can also be held to save.

Images use the selected round data, wrapped names and flexible row heights. Qualifying and race images are 1200px wide; the complete Duel bracket is 1500px wide. Phone screen width does not reduce exported resolution. Draft Duel exports are labelled DRAFT PREVIEW. Missing results remain unfilled. Race graphics include existing fastest Duel lap data, matching the current result model.

Extract this ZIP and upload the app, lib, public and tests folders into your existing GitHub repository root, replacing matching files. Keep your existing deployment configuration, dependency files and database bindings. No migration is needed. This package includes the earlier Duel/race-week update.

Checks passed: TypeScript, lint, production build, archive/race-week regressions, PNG data/layout tests with long names and 320/375/1440 viewport values. Qualifying, Duel and race generation were checked in Chrome; the race preview and download were checked at mobile width. Historical results and live data were not modified.
