# Phase 0 — Project context (read first, do not build yet)

Read this entire file before doing anything. This is the master context for a project called **ReachFlow CRM**. Every subsequent phase prompt assumes you've internalized this.

## What we're building

ReachFlow is a niche CRM for digital agencies doing cold outreach to small local businesses (trades, restaurants, service businesses). The differentiator vs generic CRMs like HubSpot or Apollo is a built-in AI outreach message generator that produces personalized DMs and emails based on each prospect's industry, pain points, and platform.

## Who it's for

- Digital agency founders and owners
- Solo freelancers doing their own lead gen
- Small agency teams (1–5 people) running outreach at volume

## Core user flows (MVP)

1. Sign up / log in via Supabase Auth
2. Add a prospect with business name, platform, handle/email, industry, location, notes
3. View all prospects in a pipeline with filterable status tags (Sent, Waiting, Replied, Booked, Dead)
4. Click a prospect to see full detail, update status, add notes
5. Generate a personalized outreach message (Instagram DM / cold email / follow-up) via Anthropic API
6. Copy message to clipboard and send manually on the relevant platform
7. See pipeline metrics: total prospects, reply rate, calls booked

## Tech stack (non-negotiable)

- **Next.js 15** with App Router and TypeScript
- **Tailwind CSS v4** (CSS-first config with `@theme` directive — NOT v3, NO tailwind.config.js)
- **shadcn/ui** components (latest version compatible with Tailwind v4)
- **Framer Motion** for complex animations
- **Custom CSS animations** for simple transitions
- **Supabase** for auth (email/password + magic link) and Postgres database
- **Anthropic API** (Claude Sonnet 4) for the outreach generator
- **Vercel** for deployment

## Design system (three themes)

Three themes named `default`, `midnight`, `sunset`. Theme switching is user-selectable and persists in localStorage + Supabase user settings.

- **Default** — clean, professional, light-first with subtle neutrals. Primary accent: indigo-blue. Feels like Linear or Vercel.
- **Midnight** — dark, premium, deep navy/charcoal base. Primary accent: electric violet. Feels like Arc browser or modern dev tools.
- **Sunset** — warm, energetic, cream/off-white base with coral and amber accents. Primary accent: coral. Feels like a boutique creative agency.

All themes use the same semantic token names (`--color-background`, `--color-foreground`, `--color-primary`, `--color-muted`, etc.) so components work across all three without modification.

## Folder structure (target)

```
├── app/
│   ├── (auth)/                  → sign-in, sign-up, forgot-password
│   ├── (dashboard)/             → protected app routes
│   │   ├── pipeline/
│   │   ├── prospects/[id]/
│   │   ├── settings/
│   │   └── layout.tsx           → sidebar, topbar
│   ├── api/
│   │   └── generate/route.ts    → Anthropic API proxy
│   ├── layout.tsx               → root layout
│   └── page.tsx                 → landing page
│
├── components/
│   ├── ui/                      → shadcn components
│   ├── crm/                     → domain components
│   └── shared/                  → layout + reusable UI
│
├── lib/
│   ├── supabase/                → client.ts, server.ts, middleware.ts
│   ├── anthropic/               → prompts.ts, client.ts
│   └── utils.ts
│
├── hooks/
├── types/
├── styles/
│   └── globals.css              → Tailwind v4 + tokens
│
├── middleware.ts                → MUST stay at root
├── next.config.ts
├── package.json
└── README.md
```

## Development rules

1. **TypeScript strict mode.** No `any` types without justification comments.
2. **Server Components by default.** Mark client components explicitly with `"use client"`.
3. **Server Actions for mutations.** Use Supabase server client in Server Actions for all writes.
4. **Row Level Security (RLS) enabled on every table.** Never rely on client-side filtering for auth.
5. **Environment variables** — never hardcode keys. Use `.env.local` with `NEXT_PUBLIC_` prefix only for client-safe values.
6. **Accessibility** — all interactive elements keyboard accessible, proper ARIA labels, focus-visible states.
7. **Mobile-first responsive** — design for mobile (375px) first, then scale up.
8. **Semantic HTML** — use `<button>`, `<nav>`, `<main>`, etc. correctly.
9. **No inline styles** except for dynamic values; use Tailwind utilities.
10. **Commit at the end of each phase.** Tag commits as `phase-1-complete`, `phase-2-complete`, etc.

## Constraints to respect

- Do NOT install extra packages unless they're specified in the phase prompt.
- Do NOT add features beyond the phase scope. If you see something that should be added later, note it in a `PHASE_NOTES.md` file instead.
- Do NOT write tests yet — a test phase comes later.
- Do NOT deploy to Vercel until explicitly instructed.
- Ask clarifying questions if a requirement is ambiguous — don't guess.

## How to acknowledge this context

After reading, reply with:

1. A one-paragraph summary of what ReachFlow is
2. A confirmation that you understand the three-theme system
3. Any clarifying questions you have before Phase 1

Then WAIT for me to send Phase 1 before writing any code.
