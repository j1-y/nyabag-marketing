# Nyabag Marketing Agent Guide

This repo is marketing-only.

Keep work scoped to public pages, SEO/blog content, legal/contact pages, public assets, the live early-access waitlist, and deployment metadata.

Do not add authenticated app code here:

- no `/app`, `/admin`, `/login`, `/signup`, or onboarding routes
- no bookmark, canvas, folder, profile, extension, Telegram, processor, or admin features
- no Supabase auth/cookie clients
- no app schema beyond `early_access_signups`

The product app lives in a separate Nyabag app repository.

## Main Files

- `src/app/page.tsx` and `src/app/LandingPage.tsx`
- `src/app/about`, `src/app/blog`, `src/app/contact`, `src/app/privacy`, `src/app/terms`
- `src/components/site/*`
- `src/lib/blog.ts`
- `src/lib/early-access-actions.ts`
- `supabase/schema.sql`

## Verification

Run `npm run lint` and `npm run build` after changes. For waitlist changes, verify invalid email handling, duplicate email handling, missing Supabase env handling, and optional Resend notification behavior.
