# ReachFlow CRM — Phased Build Prompts for Claude Code

A 7-file prompt system for building ReachFlow, a niche CRM with AI outreach generation, using Claude Code in VS Code.

## Files

1. `PHASE_0_CONTEXT.md` — Master project context. Feed first. Do NOT skip.
2. `PHASE_1_SCAFFOLD.md` — Next.js + Tailwind v4 + Supabase auth shell
3. `PHASE_2_DESIGN_SYSTEM.md` — Three themes, shadcn/ui, typography
4. `PHASE_3_DATABASE.md` — Postgres schema, RLS, server actions
5. `PHASE_4_CRM_FEATURES.md` — Pipeline, prospects, filters, detail panel
6. `PHASE_5_AI_GENERATOR.md` — Anthropic API integration, message history
7. `PHASE_6_POLISH_DEPLOY.md` — Framer Motion, reminders, landing page, Vercel

## How to use with Claude Code

### Before starting

Copy all 7 files into your project root in a folder called `.docs/build-prompts/`. They're reference material, not runtime code.

### Session 1 — Context load

Open Claude Code. Start a new session. Say:

> Read `.docs/build-prompts/PHASE_0_CONTEXT.md` and confirm you understand the project. Do not write any code until I give you Phase 1.

Wait for Claude Code to acknowledge and ask clarifying questions. Answer them. Once you're satisfied, proceed.

### Session 2+ — One phase per session

For each phase:

1. **Start a new Claude Code session** (clean context = better focus)
2. Feed Phase 0 first: *"Read `.docs/build-prompts/PHASE_0_CONTEXT.md` for context."*
3. Then feed the target phase: *"Now execute `.docs/build-prompts/PHASE_N_*.md`."*
4. Let Claude Code work. Review commits. Run the acceptance criteria yourself.
5. If Claude drifts or misses something, point to the specific acceptance criterion, not vague "this is wrong."
6. Commit with the specified tag when complete.
7. Close the session. Open a new one for the next phase.

### Why one phase per session

Claude Code loses track when sessions get long. Scoping to one phase:
- Keeps context window focused on relevant files only
- Prevents feature creep ("while I'm here, let me also...")
- Makes it easy to roll back if something goes wrong

### Quality gates between phases

DO NOT move to the next phase if:
- TypeScript build fails
- Any acceptance criterion is unchecked
- You haven't manually verified the happy path

Fix first, then progress.

## When things go wrong

- **Claude Code installed the wrong version of something** → Check against the tech stack in Phase 0. Ask Claude to downgrade/upgrade explicitly.
- **Styling looks broken across themes** → The semantic token system was bypassed. Grep for hardcoded hex colors.
- **Supabase RLS blocks legitimate reads** → Check that server actions are using the server client, not the browser client.
- **Generated messages feel generic** → Iterate on prompts in `/lib/anthropic/prompts.ts`. Don't trust AI-written prompts — tune them manually.

## Estimated timeline

With Claude Code moving at normal speed and you reviewing carefully:

- Phase 1: 1–2 hours
- Phase 2: 3–4 hours (theme work is finicky)
- Phase 3: 2–3 hours
- Phase 4: 4–6 hours (biggest UI phase)
- Phase 5: 3–4 hours
- Phase 6: 4–6 hours

**Total: 17–25 hours of focused work.**

Don't try to do it all in one day. Spread across 3–5 sessions.

## After v1.0

Phase 7 candidates (future work):
- Email sending integration (Resend / Postmark)
- CSV import for bulk prospects
- Team accounts and shared pipelines
- Mobile app (React Native / Expo)
- Chrome extension for one-click prospect capture from Instagram/LinkedIn
- Webhook integrations (Zapier, Make)
- Analytics dashboard (reply rate by industry, platform, message type)
- A/B testing for generated messages
- White-label mode for selling to other agencies
