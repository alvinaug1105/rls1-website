# RLS1 eSports — League website

Results, qualifying, WDC/WCC standings, a weekly season calendar, driver profiles, videos and moderated driver stories.

## GitHub upload

Extract the ZIP first. Upload the contents of this folder, not the ZIP itself and not an extra enclosing folder. The repository root must contain package.json, package-lock.json, app/, components/, db/, drizzle/, public/ and configuration files.

Include hidden files/folders: .gitignore, .openai/, .oxfmtrc.json and .oxlintrc.json. On macOS Finder, press Command + Shift + . to reveal them.

## Local development

Requires Node.js 22.13 or later.

```sh
npm ci
npm run dev
```

The database needs the schema in drizzle/ applied to the local D1 binding. Set LEAGUE_ADMIN_KEY in a local .dev.vars file to enable organiser publishing. Never commit that file or your key.

## Cloudflare deployment status

This is the current website source, ready to store in GitHub. It is not yet a standalone Cloudflare deployment package.

It currently uses the Sites/Vinext setup. Before deploying directly to your Cloudflare account:

- Configure your own Worker and D1 database and apply the included database migration.
- Configure the production LEAGUE_ADMIN_KEY as a secret.
- Adapt the Sites build integration to direct Cloudflare deployment.
- Replace the Sites-specific ChatGPT sign-in with an authentication flow supported by your deployment. Do not trust incoming identity headers directly on a public Worker.

Do not enable community submissions on a public deployment until authentication is adapted and verified.

Historical rounds 1–5 are included in app/season.ts. New posts and result edits live in D1; this export deliberately excludes the local database and all secrets.
