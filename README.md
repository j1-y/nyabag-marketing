# Nyabag Marketing

This repository hosts only the public marketing site for Nyabag.

The authenticated product app, dashboard, canvas, bookmark search, browser extension APIs, Telegram capture flow, processors, and admin tooling belong in the separate Nyabag app repository.

## Public Routes

- `/` - landing page and early-access form
- `/about` - product and creator overview
- `/blog` and `/blog/[slug]` - SEO/blog content
- `/contact` - support, feedback, and privacy contact paths
- `/privacy` - privacy policy
- `/terms` - terms of service
- `/sitemap.xml`, `/robots.txt`, `/llms.txt` - crawl and AI-readable metadata

## Environment

Required for the live early-access form:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional email notification:

```bash
RESEND_API_KEY=
EARLY_ACCESS_TO_EMAIL=
EARLY_ACCESS_FROM_EMAIL=
```

The early-access action writes to `public.early_access_signups` using the Supabase service-role key on the server. It does not use Supabase auth, app cookies, admin tables, rate-limit tables, or product-app schema.

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

Open `http://localhost:3000`.

## Database

The marketing database surface is intentionally small:

- `supabase/schema.sql`
- `supabase/migrations/20260703_marketing_early_access.sql`

Do not add bookmark, canvas, auth, processor, extension, Telegram, or admin schema to this repository.

## Deployment

Deploy as a standard Next.js app, with the environment variables above configured in the hosting provider. Google Analytics is loaded from the homepage and allowed by `next.config.ts` CSP.
