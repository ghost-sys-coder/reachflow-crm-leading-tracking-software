# UI Registry

### Destructive confirmation dialog

File: components/webhooks/webhook-action-forms.tsx
Last updated: 2026-08-14

| Property | Class |
| --- | --- |
| Background | `bg-popover`; consequence panel `bg-destructive/5` |
| Border | `ring-1 ring-foreground/10`; consequence panel `border border-destructive/20` |
| Border radius | Dialog `rounded-xl`; consequence panel `rounded-lg` |
| Text — primary | `text-foreground`, `font-medium` |
| Text — secondary | `text-muted-foreground`, `text-sm` |
| Spacing | Dialog `p-4`, `gap-4`; consequence panel `p-3` |
| Interactive states | Existing `Button` and Radix Alert Dialog primitives |
| Shadow | None |
| Accent usage | `bg-destructive/10 text-destructive`; destructive action button |

**Pattern notes:**
Use the accessible Alert Dialog primitive for permanent actions; never use native browser `alert`, `confirm`, or `prompt`. Name the affected record, state the cascading impact, distinguish the safe cancel action, and keep the dialog open with controls disabled while the server action is pending.

### Integration management cards

File: components/lead-sources/lead-source-manager.tsx
Last updated: 2026-08-15

| Property | Class |
| --- | --- |
| Background | `bg-card`; technical values `bg-muted/30`; success credential panel `bg-emerald-500/5` |
| Border | Design-token `border`; health/success emphasis `border-emerald-500/25` |
| Border radius | Cards `rounded-xl`; nested controls and panels `rounded-lg` |
| Text — primary | `font-medium`, `text-foreground` |
| Text — secondary | `text-sm text-muted-foreground`; technical metadata `font-mono text-xs` |
| Spacing | Card sections `space-y-4`; nested panels `p-3`; grids `gap-2` to `gap-4` |
| Interactive states | Shared Button/Input primitives; inline disabled loaders; toast plus inline feedback |
| Shadow | Shared Card defaults only |
| Accent usage | Emerald for successful credentials and processing; destructive token only for deletion/failure |

**Pattern notes:**
Integration cards expose operational state before configuration detail. Credentials appear once in a bounded success panel with explicit copy actions. Technical identifiers use monospace, permanent actions use the registered destructive confirmation dialog, and testing happens inside the application rather than through browser-native prompts.

### CRM prospect data table

File: components/crm/prospect-table.tsx
Last updated: 2026-09-04

| Property | Class |
| --- | --- |
| Background | `bg-card`; header `bg-muted/45`; hover `bg-muted/35` |
| Border | `border border-border/70`; outer `ring-1 ring-foreground/5` |
| Border radius | Container `rounded-2xl`; metadata pills `rounded-md` |
| Text — primary | `font-medium text-foreground` |
| Text — secondary | `text-xs text-muted-foreground` |
| Spacing | Rows `py-3.5`; compact metadata uses `gap-1` to `gap-2` |
| Interactive states | Row hover/focus treatment; selected rows `bg-primary/5`; shared Button and Checkbox primitives |
| Shadow | `shadow-lg shadow-foreground/5` |
| Accent usage | Primary tint for selection and business-name hover; muted tokens for metadata |

**Pattern notes:**
Use this treatment for dense CRM record tables: pair the primary identity with one helpful secondary identifier, render compact metadata as pills, and preserve clear row-level hover, focus, and selection feedback.

### CRM pagination controls

File: components/crm/prospect-pagination.tsx
Last updated: 2026-09-04

| Property | Class |
| --- | --- |
| Background | `bg-card`; active page inherits primary Button styling |
| Border | `border border-border/70` |
| Border radius | Container `rounded-xl` |
| Text — primary | `text-sm font-medium` |
| Text — secondary | `text-xs text-muted-foreground` |
| Spacing | Container `px-3 py-2.5`; controls `gap-1` to `gap-2` |
| Interactive states | Shared Button variants; disabled previous/next buttons at boundaries |
| Shadow | `shadow-sm shadow-foreground/5` |
| Accent usage | Primary active-page button; muted supporting range text |

**Pattern notes:**
Keep pagination URL-backed so pages remain linkable and browser navigation works. Preserve active filters in page links, reset to page one when a filter changes, and collapse long ranges with ellipses.

### Campaign performance stat cards

File: app/(dashboard)/campaigns/[id]/page.tsx
Last updated: 2026-09-04

| Property | Class |
| --- | --- |
| Background | Shared Card background; icon tile `bg-primary/10` |
| Border | `border-border/70`; outer `ring-1 ring-foreground/5`; icon `ring-1 ring-primary/15` |
| Border radius | Shared Card radius; icon tile `rounded-xl` |
| Text — primary | Value `text-3xl font-semibold tracking-tight text-foreground` |
| Text — secondary | Labels and supporting detail `text-xs text-muted-foreground` |
| Spacing | Card content `p-5`; content grouping `mt-1` to `mt-2` |
| Interactive states | None; display-only cards |
| Shadow | `shadow-lg shadow-foreground/5` |
| Accent usage | Primary tint reserved for the metric icon tile |

**Pattern notes:**
Campaign KPI cards pair a prominent value with a short context label and a consistent icon tile. Keep all cards structurally identical so the metric row scans evenly.

### Campaign action bar

File: components/campaigns/campaign-detail-manager.tsx
Last updated: 2026-09-04

| Property | Class |
| --- | --- |
| Background | Shared Button variants |
| Border | Shared outline and destructive Button variants |
| Border radius | Shared Button radius |
| Text — primary | Shared Button typography |
| Text — secondary | None |
| Spacing | Buttons `h-9 gap-2 px-4`; action group `gap-2` |
| Interactive states | `hover:-translate-y-0.5 hover:shadow-md active:translate-y-0` |
| Shadow | `shadow-sm shadow-foreground/10` |
| Accent usage | Destructive token only for campaign deletion |

**Pattern notes:**
Campaign management actions share identical height, horizontal padding, icon spacing, elevation, and movement. Visual hierarchy continues to come from the existing Button variants.

### CRM prospect drawer cards

File: components/crm/prospect-detail-panel.tsx
Last updated: 2026-09-04

| Property | Class |
| --- | --- |
| Background | Drawer workspace `bg-muted/20`; content cards `bg-card` |
| Border | Cards `border`; drawer header `border-b border-border` |
| Border radius | Cards `rounded-xl` |
| Text — primary | Section content `text-foreground` |
| Text — secondary | Labels `text-xs font-semibold tracking-wider text-muted-foreground uppercase` |
| Spacing | Workspace `p-4 sm:p-6`; cards `p-4`; card content `space-y-2` to `space-y-3` |
| Interactive states | Shared Button, Select, Input, and Sheet primitives |
| Shadow | Cards `shadow-sm` |
| Accent usage | Existing primary and status tokens only |

**Pattern notes:**
Use full-row cards for information that benefits from horizontal reading space, including Contact, Notes, Quick actions, and Outreach history. Within outreach forms, Channel and Message remain vertically stacked so both controls have an uninterrupted line. Record Reply also stacks Reply Intent, Objection or Reason, and conditional follow-up fields at full width.

### Settings inline creation forms

File: components/settings/tags-section.tsx, components/settings/team-section.tsx, components/settings/custom-fields-section.tsx
Last updated: 2026-09-04

| Property | Class |
| --- | --- |
| Background | Form surface `bg-muted/20`; controls `bg-background`; primary Button background |
| Border | Form surface `border-border/70`; shared form-control borders |
| Border radius | Form surface `rounded-xl`; shared form-control radius |
| Text — primary | Shared form-control typography |
| Text — secondary | Supporting copy `text-sm text-muted-foreground` |
| Spacing | Form surface `p-4`; row `gap-3`; fields `gap-1.5`; actions `px-5 gap-2` |
| Interactive states | Shared field focus/disabled states; action `hover:-translate-y-0.5 hover:shadow-md active:translate-y-0` |
| Shadow | Form `shadow-sm`; action `shadow-sm shadow-primary/25` |
| Accent usage | Primary action Button |

**Pattern notes:**
Inline Settings creation forms place related controls on a subtle bounded surface. Inputs and actions use `h-10`; Select triggers explicitly override their internal size rule with `data-[size=default]:h-10` so all controls render at the same height. The primary action is full width when stacked on mobile, then content-width and bottom-aligned beside inputs on larger screens.
