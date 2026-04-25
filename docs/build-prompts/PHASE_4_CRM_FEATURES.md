# Phase 4 — Core CRM features

**Goal:** Build the full prospect management UI. Dashboard sidebar, pipeline view with filters and stats, add/edit prospect forms, detail panel, status updates. Everything functional end-to-end against the real Supabase backend.

## Prerequisite

Phase 3 complete. Database schema live, RLS working, server actions tested.

## Scope

### 1. App shell layout

Build `/app/(dashboard)/layout.tsx` — the authenticated app shell.

Structure:
- **Sidebar** (left, 240px, collapsible on mobile to a sheet)
  - Logo: "ReachFlow" with small type accent
  - Nav items with icons (lucide-react): Pipeline, Prospects, Messages, Settings
  - User section at bottom: avatar, name, sign-out button
- **Top bar** (sticky, 56px)
  - Current page title (contextual)
  - Right side: search, theme switcher, user menu
- **Main content area** (scrollable, max-width container)

Install lucide-react: `npm install lucide-react`

### 2. Pipeline page — `/pipeline`

Build `/app/(dashboard)/pipeline/page.tsx`.

**Sections (in order):**

**A. Metrics row** — 4 stat cards
- Total prospects
- Reply rate (replied+booked / total, as percentage)
- Calls booked (count of `booked` status)
- This week's activity (count of prospects created in last 7 days)

Each card uses muted background, label above, large number below.

**B. Status filters** — horizontal pill row
- All, Sent, Waiting, Replied, Booked, Closed, Dead
- Shows count next to each status
- Active filter styled with primary color
- Clicking updates query params (`?status=replied`) so state is URL-shareable

**C. Platform filters** — secondary pill row
- All platforms, Instagram, Email, Facebook, LinkedIn, Twitter, Other

**D. Search bar** — searches business_name, handle, industry, notes

**E. Prospect list**
- Card-style rows (not a table — better on mobile)
- Each row shows: business name, industry + location, platform tag, status pill
- Click opens detail panel (right side drawer on desktop, full page on mobile)
- Empty state if no results

### 3. Add prospect flow

Build `/components/crm/add-prospect-dialog.tsx` — a shadcn Dialog component.

Triggered by a "+ Add prospect" button in the top bar and an empty-state CTA.

Form fields (all with proper labels, validation, error states):
- Business name (required)
- Platform (select, required)
- Handle / email (text)
- Industry (text with autocomplete from existing industries in user's prospects)
- Location (text)
- Website URL (optional, validated)
- Initial status (select, defaults to "sent")
- Notes (textarea)

Uses `react-hook-form` + `zodResolver` for validation. Install:
```bash
npm install react-hook-form @hookform/resolvers
```

On submit:
- Call `createProspect` server action
- Show success toast
- Close dialog
- New prospect appears in list via revalidation

### 4. Prospect detail panel

Build `/components/crm/prospect-detail-panel.tsx` using shadcn Sheet (side drawer).

Sections:
- **Header**: business name, industry, status pill, close button
- **Quick actions**: Edit, Delete (with confirmation dialog), Mark as replied / booked / dead (quick buttons)
- **Contact info**: platform, handle, location, website (with click-to-open)
- **Notes**: inline-editable textarea, auto-saves on blur
- **Activity**: timestamp of created_at, last_contacted_at, follow_up_at
- **Message history**: list of previously generated messages for this prospect (read-only, placeholder until Phase 5 populates it)
- **Tags**: list of applied tags, "+ Add tag" button (opens small popover)

### 5. Status update mechanism

Three ways to change status:
1. Quick buttons in detail panel (Replied, Booked, Dead, etc.)
2. Dropdown in each list row (right-click or three-dot menu)
3. Full edit form

All use `updateProspectStatus` server action. Use optimistic updates: UI changes immediately, reverts if server action fails.

Install if needed:
```bash
npm install sonner
```

Use `sonner` for toast notifications.

### 6. Edit prospect

Build an edit dialog (or reuse the add dialog with pre-filled values). Same form, uses `updateProspect` action.

### 7. Delete prospect

Confirmation dialog before delete. Uses `deleteProspect` action. Toast confirms success.

### 8. Tags

Build `/components/crm/tag-manager.tsx`:
- Popover showing existing user tags as checkboxes
- "Create new tag" input at bottom with color picker (preset colors: blue, green, amber, coral, purple)
- Applies/removes tags via server actions

Display tags on prospect cards and in detail panel as small colored pills.

### 9. Empty states

Every list needs a thoughtful empty state:
- No prospects at all → illustration + "Add your first prospect" CTA
- No results for current filter → "No prospects match these filters" + "Clear filters" button
- No tags yet → "Tags help you organize prospects. Create your first one."

### 10. Loading states

- Skeleton loaders for the prospect list
- Button spinners during server action mutations
- Disabled form states during submission

### 11. Responsive behavior

- **Desktop (≥1024px)**: sidebar fixed left, detail panel slides in from right (40% width), main list stays visible
- **Tablet (768–1023px)**: sidebar collapsible, detail panel takes 60% width overlaying list
- **Mobile (<768px)**: sidebar becomes a Sheet, detail panel becomes a full-screen page, stats row scrolls horizontally

## Acceptance criteria

- [ ] User can add, view, edit, delete prospects
- [ ] Pipeline shows correct stats calculated from real data
- [ ] All filters work and combine correctly (status + platform + search)
- [ ] URL query params update with filter changes
- [ ] Detail panel opens/closes smoothly
- [ ] Status updates work via all three mechanisms
- [ ] Tags can be created, applied, removed, deleted
- [ ] Optimistic updates feel instant
- [ ] Mobile layout is usable (tested at 375px width)
- [ ] All three themes still look correct — no hardcoded colors leaked in
- [ ] Empty states and loading states display correctly
- [ ] No TypeScript errors on `npm run build`

## What NOT to do in Phase 4

- Do NOT integrate the AI outreach generator (Phase 5)
- Do NOT add Framer Motion animations yet (Phase 6)
- Do NOT add bulk actions, CSV import, or data export
- Do NOT add team features or sharing

## Report back

1. Screenshots of pipeline page in all three themes (desktop and mobile)
2. List of new dependencies installed
3. Performance: time to first paint and time to interactive
4. Any UX compromises made and why

Commit as `phase-4-complete`.
