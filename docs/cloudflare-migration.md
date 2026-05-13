# Cloudflare Migration Handoff

Last updated: 2026-05-13

This project is migrating in two layers:

- Cloudflare Pages serves the Vite/Vue static frontend.
- Cloudflare Workers gradually replaces Vercel `/api/*` endpoints.

Keep Vercel deployed until every API endpoint is migrated to the Worker and the custom domain has been tested end to end.

## Current Status

Done:

- Vercel function count was reduced to the Hobby limit by removing unused `afdian-webhook` and moving non-route files out of `api/`.
- Cloudflare Pages SPA fallback was added in `public/_redirects`.
- Worker skeleton was added in `worker/`.
- Worker deploy succeeded at `https://qimen.oceanjustinlin.workers.dev`.
- Worker currently supports:
  - `/api/health`
  - `/api/divination-route`
- Broken Git submodule metadata was fixed by adding `.gitmodules` for `bazi`.
- The `bazi` submodule pointer was moved to remote commit `7150d5b`, because the previous pointer `3945be4` was only local and Cloudflare could not fetch it.

Pending:

- Deploy Cloudflare Pages frontend.
- Verify `https://qimen.oceanjustinlin.workers.dev/api/health`.
- Verify `POST /api/divination-route`.
- Migrate the remaining API endpoints one by one.
- Bind custom domains only after all API routes are migrated and verified.

## Important Repository Shape

The GitHub repository root is the app root. Do not use `qimen/` as a Cloudflare root directory.

Use:

```text
Repository root:
/

Frontend:
/

Worker:
/worker
```

## Cloudflare Pages Setup

Create a Cloudflare Pages project from the GitHub repository.

Use these build settings:

```text
Framework preset: Vue
Root directory: /
Build command: npm run build
Build output directory: dist
Production branch: main
```

The SPA fallback is handled by `public/_redirects`:

```text
/* /index.html 200
```

Pages frontend environment variables:

```text
VITE_GITHUB_URL=https://github.com/oceanjustinlin/qimen
```

Optional:

```text
VITE_AFDIAN_URL=
```

Do not put server secrets in Pages variables. Never put these in Pages:

```text
GEMINI_API_KEY
SUPABASE_SERVICE_KEY
WHITELIST_EMAILS
```

## Worker Build Settings

The Worker project is already connected to GitHub and has deployed successfully.

Use these Worker build settings in Cloudflare:

```text
Build command: echo "skip build"
Deploy command: npx wrangler deploy
Non-production branch deploy command: npx wrangler versions upload
Path: worker
Production branch: main
```

The Worker config lives at `worker/wrangler.toml`.

The Worker name should match the Cloudflare service name:

```text
qimen
```

## Worker Variables And Secrets

Set these in Cloudflare Worker Settings -> Variables and secrets.

Secrets:

```text
GEMINI_API_KEY
SUPABASE_SERVICE_KEY
```

Variables:

```text
SUPABASE_URL=https://xkbqiiwwgfzkyfhxuoev.supabase.co
FRONTEND_URL=https://qimendao.com,https://www.qimendao.com
WHITELIST_EMAILS=linjunyan0726@vip.qq.com,blairzbz1112@gmail.com,yangyue99329@126.com
```

`SUPABASE_SERVICE_KEY` can be either the legacy `service_role` key or the newer Supabase `sb_secret_...` key. It must stay server-side only.

## Worker Verification

After Worker deploy, verify:

```text
GET https://qimen.oceanjustinlin.workers.dev/api/health
```

Expected response:

```json
{"ok":true,"service":"qimen-api"}
```

Then test:

```sh
curl -X POST https://qimen.oceanjustinlin.workers.dev/api/divination-route \
  -H "Content-Type: application/json" \
  -d '{"question":"我明天面试能不能过？"}'
```

Expected shape:

```json
{
  "branch": "qimen",
  "category": "career_business",
  "subcategory": "job_search",
  "confidence": "high"
}
```

Exact text fields may vary.

## Do Not Switch Production API Yet

Do not bind these routes yet:

```text
qimendao.com/api/*
www.qimendao.com/api/*
```

Only bind them after every production API endpoint has been migrated to Worker.

For now, Vercel remains the production API host.

## Remaining API Migration Order

Already migrated:

```text
1. /api/divination-route
2. /api/fortune-annual
3. /api/fortune-weekly
4. /api/fortune-monthly
5. /api/fortune-daily
```

Recommended next steps:

```text
6. /api/context-notes
7. /api/bazi-question
8. /api/bazi-calibrate
9. /api/fortune-daily-interpretation
10. /api/fortune-monthly-interpretation
11. /api/qimen
12. /api/bazi
```

Migrate one route at a time and verify each route before moving on.

## Notes For Next Agent

- The Worker currently imports `../../lib/divinationRouter.js` from `worker/src/index.js`.
- `divinationRouter` supports injected LLM classifiers, so the Worker can use `env.GEMINI_API_KEY` instead of `process.env.GEMINI_API_KEY`.
- Remaining Vercel API files still use `req`/`res` and `process.env`; do not copy them blindly into Worker without an adapter or refactor.
- Cloudflare Worker is not a full Node.js server. Watch for `node:fs`, runtime file reads, and CommonJS interop.
- `lib/siziSummary.js` currently uses `node:fs`; this will matter when migrating `/api/bazi`.
- The app should keep `/api/*` paths stable so the frontend does not need a large rewrite.
