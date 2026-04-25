# Phase 2 — Design system & three themes

**Goal:** Build the complete design system foundation. Three themes (Default, Midnight, Sunset) driven by semantic CSS variables. Install and configure shadcn/ui. Create base components. No CRM features yet.

## Prerequisite

Phase 1 complete, committed, and passing all acceptance criteria. DO NOT proceed if Phase 1 is broken.

## Scope

### 1. Semantic token system

In `/globals.css`, define semantic tokens for all three themes using the Tailwind v4 `@theme` directive and CSS custom properties.

**Semantic tokens required (all three themes must define these):**

```
--color-background         → main page background
--color-foreground         → primary text on background
--color-card               → raised surface background
--color-card-foreground    → text on card
--color-popover            → popover/dropdown background
--color-popover-foreground
--color-primary            → brand accent color
--color-primary-foreground → text on primary
--color-secondary          → secondary surface
--color-secondary-foreground
--color-muted              → muted surface (subtle bg)
--color-muted-foreground   → muted text (hints, labels)
--color-accent             → hover/highlight bg
--color-accent-foreground
--color-destructive        → error/delete
--color-destructive-foreground
--color-success            → positive status
--color-warning            → caution status
--color-border             → default border color
--color-input              → input border
--color-ring               → focus ring
--radius                   → 0.5rem default
```

**Theme palettes:**

**Default theme** (light, professional)
- Background: near-white (#FAFAF9 / OKLCH equivalent)
- Foreground: deep slate (#0A0A0A)
- Primary: indigo-blue (#4F46E5)
- Muted: cool gray (#F1F5F9)
- Border: subtle neutral (#E4E4E7)

**Midnight theme** (dark, premium)
- Background: deep navy-charcoal (#0A0A14)
- Foreground: near-white (#F4F4F5)
- Primary: electric violet (#8B5CF6)
- Card: slightly lighter navy (#12121F)
- Muted: dark slate (#1E1E2E)
- Border: subtle glow (#2A2A3F)

**Sunset theme** (warm, creative)
- Background: cream (#FFF8F0)
- Foreground: warm brown-black (#1F1612)
- Primary: coral (#F97316)
- Secondary accent: amber (#F59E0B)
- Card: warm off-white (#FFFDF7)
- Muted: peach-beige (#FDF2E4)
- Border: soft warm tan (#E8D5B7)

Use OKLCH color space for all colors where possible — it handles perceptual lightness better than HSL or RGB.

### 2. Theme switching infrastructure

- Apply theme via `data-theme` attribute on `<html>`: `data-theme="default"`, `data-theme="midnight"`, `data-theme="sunset"`.
- CSS rule structure: `:root[data-theme="midnight"] { --color-background: ...; }` etc.
- Create `/components/shared/theme-provider.tsx` — a client component that reads theme from localStorage on mount and applies it. Prevent flash of unstyled content (FOUC) using a small inline script in `layout.tsx` that runs before hydration.
- Create `/components/shared/theme-switcher.tsx` — a dropdown that cycles through the three themes and persists selection.
- Create `/hooks/use-theme.ts` — hook that exposes `theme` and `setTheme`.

### 3. Typography

In `globals.css`, set up type scale using Tailwind v4 `@theme`:

- Font family: Inter for sans (load via `next/font/google`), JetBrains Mono for mono
- Sizes: xs (12px), sm (13px), base (14px), md (15px), lg (16px), xl (18px), 2xl (22px), 3xl (28px), 4xl (36px)
- Weights: 400 regular, 500 medium, 600 semibold only
- Line heights: tight (1.2), normal (1.5), relaxed (1.7)

### 4. Install shadcn/ui

```bash
npx shadcn@latest init
```

Configure with:
- Base color: Slate
- CSS variables: YES
- Import alias: `@/components/ui`
- Framework: Next.js App Router
- Style: new-york

When shadcn asks about overwriting `globals.css`, review carefully — preserve our custom `@theme` tokens. Merge shadcn's variables into our semantic system rather than replacing.

### 5. Install base components

Install exactly these components, no more:

```bash
npx shadcn@latest add button input label textarea select card badge dialog dropdown-menu avatar sheet skeleton separator tabs toast form
```

After install, audit each component file. Replace any hardcoded color classes with our semantic tokens. Ensure every component renders correctly in all three themes by testing with the theme switcher.

### 6. Custom animation utilities

In `globals.css`, add custom keyframes and animation utilities:

```css
@keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes slide-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
@keyframes shimmer { /* for loading skeletons */ }
```

Expose as Tailwind utilities: `animate-fade-in`, `animate-slide-up`, `animate-shimmer`.

### 7. Build a design system preview page

Create `/app/(dashboard)/design-system/page.tsx` — a preview page that showcases EVERY installed component in all three themes. Include:

- Color palette swatches (background, foreground, primary, muted, accent, destructive, success, warning, border)
- Typography scale (all sizes and weights)
- Buttons (all variants and sizes)
- Inputs, textareas, selects, labels
- Cards with various content
- Badges (all variants)
- A sample dialog
- A dropdown menu
- Avatar with initials
- Skeleton loaders
- Tabs
- A toast trigger

This page is both a reference and a visual regression check. Include the theme switcher at the top.

### 8. Focus and accessibility

- Every interactive element has a visible focus ring using `--color-ring`
- All color combinations pass WCAG AA contrast (4.5:1 for body text, 3:1 for UI)
- Test Sunset theme carefully — warm colors can fail contrast easily

## Acceptance criteria

- [ ] All three themes toggle without flicker (no FOUC)
- [ ] Theme choice persists across page reloads
- [ ] `/design-system` renders every component correctly in all three themes
- [ ] All text passes WCAG AA contrast in every theme
- [ ] No hardcoded hex colors anywhere in components — only semantic tokens
- [ ] `npm run build` passes
- [ ] Build output has no console warnings about Tailwind or shadcn
- [ ] Keyboard navigation works across all components (Tab, Enter, Esc)

## What NOT to do in Phase 2

- Do NOT create database schemas
- Do NOT add Framer Motion (Phase 6)
- Do NOT build the prospect list, detail panel, or AI generator
- Do NOT add Supabase tables
- Do NOT deploy

## Report back

When Phase 2 is complete:

1. Screenshots (or descriptions) of `/design-system` in all three themes
2. List of installed shadcn components
3. Any component-level deviations from the spec and why
4. Contrast audit results for Sunset theme specifically

Commit as `phase-2-complete`.
