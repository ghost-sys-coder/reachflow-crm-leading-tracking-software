# ReachFlow CRM

A niche CRM for digital agencies running cold outreach to small local businesses, with a built-in AI outreach message generator.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (CSS-first config via `@theme`)
- shadcn/ui
- Supabase (Auth + Postgres)
- Anthropic API (Claude) — added in Phase 5
- Framer Motion + Sonner
- Vercel (deployment)

## Setup

```bash
git clone <repo-url>
cd scalable-agency-crm
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Required environment variables (set these in `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

Open http://localhost:3000.

## Phase tracking

- [x] **Phase 1** — Scaffolding: Supabase client trio, root `proxy.ts` (session refresh + route guards), `(auth)` sign-in/sign-up + callback, `(dashboard)` shell
- [ ] Phase 2 — Design system (default / midnight / sunset themes)
- [ ] Phase 3 — Database schema + RLS
- [ ] Phase 4 — Pipeline UI
- [ ] Phase 5 — AI outreach generator
- [ ] Phase 6 — Animations
