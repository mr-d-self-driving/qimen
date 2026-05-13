# Cloudflare Migration

This project migrates in two layers:

- Cloudflare Pages serves the Vite/Vue static frontend.
- Cloudflare Workers serves `/api/*` endpoints.

Keep Vercel deployed until the Worker has migrated every API endpoint and the custom domain has been tested.

## Pages Setup

Create a Cloudflare Pages project from the GitHub repository.

Use these build settings:

```text
Root directory: qimen
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Production branch: main
```

The SPA fallback is handled by `public/_redirects`:

```text
/* /index.html 200
```

Frontend environment variables:

```text
VITE_GITHUB_URL=https://github.com/oceanjustinlin/qimen
VITE_AFDIAN_URL=
```

Do not put server secrets in Pages variables.

## Worker Setup

The Worker lives in `worker/`.

Install secrets in Cloudflare:

```sh
cd qimen/worker
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put FRONTEND_URL
```

Deploy the Worker:

```sh
cd qimen/worker
npx wrangler deploy
```

Current migrated Worker routes:

```text
/api/health
/api/divination-route
```

After all APIs are migrated and verified, bind the Worker route:

```text
qimendao.com/api/*
www.qimendao.com/api/*
```

Bind Pages to:

```text
qimendao.com
www.qimendao.com
```

## Recommended Migration Order

```text
1. /api/divination-route
2. /api/fortune-annual
3. /api/fortune-weekly
4. /api/fortune-monthly
5. /api/fortune-daily
6. /api/context-notes
7. /api/bazi-question
8. /api/bazi-calibrate
9. /api/fortune-daily-interpretation
10. /api/fortune-monthly-interpretation
11. /api/qimen
12. /api/bazi
```
