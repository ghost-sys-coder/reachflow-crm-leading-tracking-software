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
