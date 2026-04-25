# Phase 6 — Polish, animations & deployment

**Goal:** Make it feel like a product, not a prototype. Add Framer Motion animations, follow-up reminders, a proper landing page, and deploy to Vercel.

## Prerequisite

Phase 5 complete. Full app works end-to-end. AI generator produces quality output.

## Scope

### 1. Install Framer Motion

```bash
npm install framer-motion
```

### 2. Motion rules (keep it restrained)

Before animating anything, internalize:
- Animation should serve clarity, not decoration
- Prefer transforms (scale, translate) over layout-changing properties (width, height)
- Respect `prefers-reduced-motion` — every animation must check this
- Duration: UI micro-interactions 150–200ms, layout transitions 250–350ms, nothing over 500ms

Create `/lib/motion/variants.ts` with shared variants:
```ts
export const fadeInUp = { ... }
export const staggerChildren = { ... }
export const panelSlide = { ... }
```

Create `/hooks/use-reduced-motion.ts` that wraps Framer's `useReducedMotion`.

### 3. Where to animate

**Prospect list**
- Staggered fade-in of cards on initial load (subtle, 50ms delay between rows, only on first render)
- Exit animation when a prospect is deleted (slide out + fade)
- Entry animation when new prospect added (slide in from top)

**Detail panel**
- Smooth slide-in from right on open (already partially there via Sheet; replace with Framer motion for more control)
- Slide-out on close

**Status pill updates**
- When status changes, the new pill pulses subtly (scale 1 → 1.08 → 1) to draw attention

**AI message generation**
- Typewriter-style streaming effect as content appears
- Fade in of action buttons after generation completes

**Metric cards**
- Numbers animate from 0 to final value on page load (using `useSpring`)
- Don't re-animate on filter changes (only on initial mount)

**Theme switcher**
- Cross-fade between themes with `view-transitions` API where supported, fall back to Framer

**Dialogs / modals**
- Scale + fade on open (shadcn default is fine, just tune the easing)

**Nav items**
- Subtle hover: background fade in over 150ms

### 4. Follow-up reminders

Build the reminders system:

**Database:** already have `follow_up_at` column from Phase 3.

**UI:**
- In prospect detail panel, add "Set follow-up reminder" date picker (install `react-day-picker` via shadcn's Calendar component if not present)
- Dashboard home page (new, at `/dashboard` or `/home`) shows a "Follow up today" section with prospects whose `follow_up_at <= today`
- Badge on sidebar showing count of due follow-ups

**Optional (stretch):** Email notifications via Supabase Edge Functions. Don't build unless time allows — document as a Phase 7 feature.

### 5. Landing page

Build `/app/page.tsx` as a proper marketing landing page:

Sections:
- **Hero** — headline, subhead, CTA button (go to sign-up), small demo visual
- **Problem/solution** — "Most outreach tools are built for enterprise sales teams" + positioning for solo agencies
- **Features** — 3-4 cards: Pipeline tracking, AI personalization, Multi-platform, Theme customization
- **How it works** — 3 steps: Add prospects → Generate messages → Track replies
- **Pricing** — placeholder (Free tier + paid plans if time; otherwise just "Coming soon")
- **FAQ** — accordion with 5-6 common questions
- **Footer** — minimal

Animate sections on scroll using Framer Motion's `whileInView`.

### 6. Settings polish

- Profile photo upload to Supabase Storage
- Agency logo upload
- Password change flow
- Delete account (with confirmation, cascades via RLS/FK)

### 7. Keyboard shortcuts

Add a few power-user shortcuts:
- `Cmd+K` — open command palette (install `cmdk` or shadcn's command component)
- `N` — new prospect
- `/` — focus search
- `Esc` — close detail panel or dialog

Command palette searches prospects by name, lets users jump to pages, triggers quick actions.

### 8. Performance pass

- Audit Lighthouse scores — target 90+ on Performance, Accessibility, Best Practices
- Image optimization: use `next/image` everywhere, no raw `<img>` tags
- Dynamic imports for heavy components (e.g., the detail panel only loads when opened)
- Verify no unnecessary client components — push to server wherever possible
- Bundle analyzer check: `npm install -D @next/bundle-analyzer`

### 9. Error boundaries

- Global error boundary in `/app/error.tsx`
- `not-found.tsx` at root and in dashboard
- Proper 500 error handling with a friendly UI

### 10. Deploy to Vercel

- Connect repo to Vercel
- Configure all environment variables in Vercel project settings
- Set production redirect URLs in Supabase Auth
- Update Supabase site URL to the Vercel domain
- Test full flow in production: sign up → add prospect → generate message → mark as sent
- Set up a custom domain if available (e.g., `reachflow.veilcode.studio`)

### 11. Analytics

Install Vercel Analytics and Speed Insights:
```bash
npm install @vercel/analytics @vercel/speed-insights
```

Add to root layout.

### 12. Documentation

Finalize `README.md`:
- Hosted demo link
- Screenshots (all three themes)
- Setup instructions
- Supabase migration steps
- Environment variables reference
- Deployment guide

Create `PHASE_NOTES.md` with:
- Features deliberately deferred
- Known issues
- Phase 7+ roadmap ideas

## Acceptance criteria

- [ ] All animations respect `prefers-reduced-motion`
- [ ] Lighthouse Performance ≥ 90 on production
- [ ] Lighthouse Accessibility ≥ 95
- [ ] Follow-up reminders work and display on home
- [ ] Landing page is polished and converts (test with a friend)
- [ ] Command palette works with all shortcuts
- [ ] Production deploy passes smoke test end-to-end
- [ ] All three themes still work in production
- [ ] Email sign-up on production actually creates a user (check Supabase)
- [ ] No console errors in production
- [ ] Mobile responsive works on real iOS and Android devices
- [ ] README documents everything needed for someone else to run this

## Stretch goals (only if time)

- Streaming AI responses (Server-Sent Events)
- CSV import for bulk prospects
- Bulk status updates
- Email sending via Resend integration
- Team collaboration (shared prospect lists)

## Report back

1. Production URL
2. Lighthouse report screenshots
3. Video walkthrough (2 min)
4. Bundle size analysis
5. Cost estimate per 100 active users per month
6. Proposed pricing tiers

Commit as `phase-6-complete` and tag as `v1.0.0`.
