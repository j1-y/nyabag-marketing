# Feature Registry

## Bookmarks

- Feature: Bookmark dashboard
- Description: Main saved-inspiration workspace with cards, filtering, pending creation, ranked hybrid search, and detail views.
- Key Files: `src/app/app/(dashboard)/page.tsx`, `src/components/bookmarks/*`, `src/hooks/useBookmarks.tsx`, `src/lib/actions.ts`, `src/lib/bookmark-search/*`, `src/lib/semantic/*`, `src/lib/visual-memory/*`, `src/lib/bookmarks/*`, `src/lib/data.ts`, `src/lib/metadata.ts`, `supabase/schema.sql`
- Dependencies: Supabase auth, bookmark tables, lexical search vector, Gemini embeddings, visual memory, screenshot and metadata enrichment, optional processor jobs
- Status: Active

## Bookmark Search

- Feature: Ranked hybrid bookmark search
- Description: Server-ranked search over weighted lexical matches, Gemini retrieval embeddings, and optional visual-memory evidence. Active dashboard searches do not union broad local substring matches.
- Key Files: `src/lib/bookmark-search/*`, `src/lib/semantic/actions.ts`, `src/lib/semantic/memory-text.ts`, `src/lib/semantic/embeddings.ts`, `src/hooks/useBookmarks.tsx`, `src/components/bookmarks/BookmarkSearchBar.tsx`, `src/components/bookmarks/BookmarkGrid.tsx`, `scripts/reindex-bookmark-search.mjs`, `scripts/evaluate-bookmark-search.mjs`, `tests/bookmark-search-fixtures.json`, `docs/BOOKMARK_SEARCH_ARCHITECTURE.md`, `supabase/schema.sql`
- Dependencies: Supabase RLS, `search_bookmarks_lexical`, `bookmarks.search_vector`, `bookmark_embeddings.retrieval_schema_version`, pgvector 768, Gemini embeddings, optional visual memory chunks/facts
- Status: Active

## Canvas

- Feature: Infinite canvas
- Description: Desktop-first visual workspace for notes, media, links, embeds, sections, and drag-resize interactions.
- Key Files: `src/app/app/(dashboard)/canvas/page.tsx`, `src/components/canvas/*`, `src/hooks/useNotes.tsx`, `src/lib/canvas-actions.ts`, `src/lib/canvas-data.ts`, `src/lib/social-embeds.ts`, `supabase/schema.sql`
- Dependencies: Supabase auth, storage, signed URLs, route-level loading UI
- Status: Active

## Mobile Capture

- Feature: Mobile URL capture
- Description: Constrained mobile experience that lets authenticated users submit URLs without opening the full desktop workspace.
- Key Files: `src/components/layout/MobileBookmarkCapture.tsx`, `src/components/layout/DashboardShell.tsx`, `src/app/app/(dashboard)/layout.tsx`, `src/lib/actions.ts`
- Dependencies: Supabase auth, bookmark creation pipeline
- Status: Active

## Profile

- Feature: Profile settings
- Description: User profile editor with avatar upload plus semantic and Telegram-related panels.
- Key Files: `src/app/app/(dashboard)/profile/page.tsx`, `src/components/profile/*`, `src/lib/profile.ts`, `src/lib/actions.ts`
- Dependencies: Supabase auth, `profile-avatars` storage bucket
- Status: Active

## Folders

- Feature: Folder hierarchy
- Description: Nested bookmark organization with inbox, breadcrumbs, move, rename, and delete flows.
- Key Files: `src/app/app/(dashboard)/folders/[folderId]/page.tsx`, `src/components/folders/*`, `src/lib/folder-actions.ts`, `src/lib/folders.ts`, `supabase/schema.sql`
- Dependencies: Bookmark tables, folder tables, Supabase auth
- Status: Active

## Design DNA

- Feature: Design DNA extraction
- Description: Saved styleguide views extracted from bookmarks, including colors, typography, and component signals.
- Key Files: `src/app/app/(dashboard)/design-dna/page.tsx`, `src/app/app/(dashboard)/design-dna/[id]/page.tsx`, `src/lib/design-dna/*`, `src/components/design-dna/*`, `src/lib/actions.ts`
- Dependencies: Bookmark data, extraction pipeline, screenshot data
- Status: Active

## Onboarding

- Feature: Onboarding wizard
- Description: First-run setup that captures workspace context and gates access until the user completes setup.
- Key Files: `src/app/onboarding/page.tsx`, `src/components/onboarding/*`, `src/lib/onboarding.ts`, `src/lib/onboarding-actions.ts`, `src/lib/actions.ts`
- Dependencies: Supabase auth, onboarding table/state
- Status: Active

## Admin

- Feature: Admin console
- Description: Internal management surfaces for users, logs, emails, storage, settings, and early access.
- Key Files: `src/app/admin/*`, `src/components/admin/*`, `src/lib/admin/*`
- Dependencies: Admin auth, service-role access, email provider, Supabase data
- Status: Active

## Public Site

- Feature: Marketing and content site
- Description: Public landing page, blog, about, contact, privacy, and terms routes.
- Key Files: `src/app/page.tsx`, `src/app/LandingPage.tsx`, `src/app/blog/*`, `src/app/about/page.tsx`, `src/app/contact/page.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/components/site/*`
- Dependencies: Public metadata, analytics script, crawlable internal links
- Status: Active

## Extension

- Feature: Browser extension API
- Description: API routes that support browser-extension auth, capture, upload, and commit flows.
- Key Files: `src/app/api/extension/*`, `src/lib/extension/*`
- Dependencies: Supabase auth, CORS rules, capture storage, extension client state
- Status: Active

## Future Features

- Browser Extension
- Figma Integration
- Better visual-memory ranking
- More robust processor observability
