# Phase 1 — Project scaffolding

**Goal:** Bootstrap the Next.js project with Tailwind v4, Supabase auth wiring, and the folder structure defined in Phase 0. No UI, no design system, no features. Just a working shell that authenticates.

## Scope (do exactly this, nothing more)

### 1. The project has been initialized

### 2. Install dependencies

Install exactly these, no more:

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D @types/node
```

### 3. Environment setup

Create `.env.local` with placeholders (do NOT commit real keys):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

Create `.env.example` mirroring the above with empty values. Add `.env.local` to `.gitignore` (confirm it's already there from create-next-app).

### 4. Folder structure

Create the full folder structure from Phase 0, but leave directories empty except where noted below. Create empty `.gitkeep` files so empty folders commit.

### 5. Supabase client setup

Create three files under `/lib/supabase/`:

**`client.ts`** — browser client using `createBrowserClient` from `@supabase/ssr`
**`server.ts`** — server client using `createServerClient` from `@supabase/ssr` with cookie handling for Server Components, Server Actions, and Route Handlers
**`middleware.ts`** — session refresh helper function

Follow the official Supabase Next.js App Router SSR docs exactly. Use the latest patterns (April 2026).

### 6. Middleware

Create `middleware.ts` at the project root (not inside src). It should:

- Refresh the Supabase session on every request
- Protect all routes under `(dashboard)` — redirect to `/sign-in` if no session
- Redirect authenticated users away from `(auth)` routes to `/pipeline`

### 7. Auth pages (minimal, no styling beyond defaults)

Create these as placeholder pages. No fancy UI yet — just functional forms.

- `/app/(auth)/sign-in/page.tsx` — email + password form, call Supabase `signInWithPassword`
- `/app/(auth)/sign-up/page.tsx` — email + password form, call `signUp`
- `/app/(auth)/layout.tsx` — simple centered container
- `/app/auth/callback/route.ts` — OAuth/magic link callback handler

### 8. Dashboard shell

- `/app/(dashboard)/layout.tsx` — placeholder layout with a signed-in user's email displayed and a sign-out button. No sidebar or styling yet.
- `/app/(dashboard)/pipeline/page.tsx` — placeholder page that says "Pipeline (Phase 4)"
- `/app/page.tsx` — simple landing page with links to `/sign-in` and `/sign-up`

### 9. Root files

- `/app/layout.tsx` — root HTML, imports `globals.css`, sets `<html lang="en">` with no theme attribute yet
- `/styles/globals.css` — Tailwind v4 imports only, no custom tokens yet (that's Phase 2)
- `src/lib/utils.ts` — export a `cn` helper using `clsx` and `tailwind-merge` (install both)

```bash
npm install clsx tailwind-merge
```

### 10. README

Write a `README.md` with:

- Project name and one-line description
- Stack list
- Setup instructions (clone, install, env vars, run)
- Phase tracking section (check Phase 1 complete)

## Acceptance criteria

Before marking Phase 1 complete, verify ALL of these:

- [ ] `npm run dev` starts without errors
- [ ] Visiting `/` shows the landing page
- [ ] `/sign-up` creates a new Supabase user (check in Supabase dashboard)
- [ ] `/sign-in` authenticates an existing user and redirects to `/pipeline`
- [ ] `/pipeline` shows the placeholder text and user email
- [ ] Signing out redirects back to `/` or `/sign-in`
- [ ] Unauthenticated access to `/pipeline` redirects to `/sign-in`
- [ ] Authenticated access to `/sign-in` redirects to `/pipeline`
- [ ] TypeScript compiles with no errors (`npm run build` passes)
- [ ] `.env.local` is git-ignored
- [ ] Folder structure matches Phase 0 spec

## What NOT to do in Phase 1

- Do NOT install shadcn yet
- Do NOT create any UI components
- Do NOT add theme switching
- Do NOT create database tables yet (that's Phase 3)
- Do NOT add the Anthropic client yet (that's Phase 5)
- Do NOT add Framer Motion yet (that's Phase 6)

## Report back

When Phase 1 is complete, reply with:

1. Confirmation all acceptance criteria pass
2. The exact `package.json` dependencies installed
3. A tree output of the folder structure
4. Any deviations from the spec and why
5. Questions or blockers before Phase 2

Commit as `phase-1-complete`.
