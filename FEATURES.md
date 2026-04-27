# ReachFlow CRM — Feature Backlog

Pick one feature at a time. Mark it **In Progress** when you start, **Done** when shipped.

---

## Tier 1 — High Impact (build these first)

| # | Feature | Status |
|---|---------|--------|
| 1 | [CSV bulk import of prospects](#1-csv-bulk-import) | Done |
| 2 | [Export prospects to CSV](#2-export-prospects-to-csv) | Done |
| 3 | [Analytics dashboard](#3-analytics-dashboard) | Done |
| 4 | [Follow-up reminders via email](#4-follow-up-reminders) | Done |
| 5 | [Message templates library](#5-message-templates-library) | Not started |

---

## Tier 2 — Mid-tier (build after Tier 1)

| # | Feature | Status |
|---|---------|--------|
| 6 | [Billing & subscription (Stripe)](#6-billing--subscription) | Not started |
| 7 | [In-app notifications](#7-in-app-notifications) | Not started |
| 8 | [Activity / audit log](#8-activity--audit-log) | Not started |
| 9 | [Multi-step outreach sequences](#9-multi-step-outreach-sequences) | Not started |
| 10 | [Custom fields on prospects](#10-custom-fields-on-prospects) | Not started |

---

## Tier 3 — Growth / Monetisation (build when selling to others)

| # | Feature | Status |
|---|---------|--------|
| 11 | [Client reporting portal](#11-client-reporting-portal) | Not started |
| 12 | [Zapier / webhook integration](#12-zapier--webhook-integration) | Not started |
| 13 | [White-label support](#13-white-label-support) | Not started |

---

## Feature Details

### 1. CSV Bulk Import

Upload a `.csv` file to create many prospects at once. Map columns (name, email, company, etc.) to database fields. Validate rows and report errors per-row without failing the whole import. Useful when migrating from another CRM or importing scraped leads.

**Scope:** file input + column mapper UI, server action to parse + insert, per-row error report.

---

### 2. Export Prospects to CSV

Download the current filtered prospect list as a `.csv` file. Respects active filters (status, assignee, search). Useful for handing off a list to a VA or running mail merges outside the app.

**Scope:** server action that streams a CSV response; button on the prospects/pipeline page.

---

### 3. Analytics Dashboard

A dedicated `/analytics` page showing:
- Reply rates by status (contacted → replied → booked)
- Conversion funnel (prospects added → outreach sent → booked)
- Team performance (prospects contacted per member, booking rate per member)
- Activity over time (new prospects added per week)

**Scope:** new page, read-only aggregate queries, recharts or similar for visualisation.

---

### 4. Follow-up Reminders

Daily digest email sent at a configurable time (e.g. 8 AM) listing every prospect whose `follow_up_at` is today or overdue. Uses the existing nodemailer setup. Each user gets their own digest for prospects assigned to them; admins see all overdue.

**Scope:** cron job (Vercel cron or Supabase pg_cron), email template, opt-out toggle in settings.

---

### 5. Message Templates Library

Admins can create reusable outreach templates (subject line + body with `{{agency_name}}`, `{{prospect_name}}` etc. placeholders). Team members pick a template when writing an outreach message, which pre-fills the composer and resolves the placeholders.

**Scope:** `message_templates` table, CRUD in settings, template picker in the outreach composer.

---

### 6. Billing & Subscription

Required before selling to other businesses. Stripe Checkout for plan selection, Stripe Customer Portal for self-serve upgrades/cancellations. Plans gate features (e.g. seat count, number of prospects). Webhooks update a `subscriptions` table; middleware blocks access when subscription is inactive.

**Scope:** Stripe SDK, webhook endpoint, `subscriptions` table, plan-gating middleware, billing settings tab.

---

### 7. In-App Notifications

Bell icon in the nav with a dropdown of recent events: lead assigned to you, follow-up due today, status changed on a prospect you own. Stored in a `notifications` table, marked read on click. Optionally send a push/email for high-priority events.

**Scope:** `notifications` table, server action to create notifications on key events, bell UI with unread count badge.

---

### 8. Activity / Audit Log

Every action on a prospect (status changed, note added, outreach sent, assignee changed) is recorded in an `activity_log` table with `user_id`, `action`, `old_value`, `new_value`, `created_at`. Shown as a timeline on the prospect detail panel.

**Scope:** `activity_log` table, helper to insert on each mutation, timeline UI on prospect detail.

---

### 9. Multi-Step Outreach Sequences

Define a sequence: day 1 send DM → day 3 send follow-up → day 7 send email. Attach a sequence to a prospect and the system schedules the steps automatically. Each step can be a different channel (email, LinkedIn DM, etc.) and can be skipped if the prospect replies.

**Scope:** `sequences`, `sequence_steps`, `prospect_sequences` tables, scheduler (pg_cron or Vercel cron), step execution engine, sequence builder UI.

---

### 10. Custom Fields on Prospects

Admins define extra fields for their org (e.g. "Budget", "Decision maker", "Deal size"). Stored in a `custom_field_definitions` table; values stored in a JSONB `custom_fields` column on `prospects`. Rendered dynamically on the prospect detail panel and filterable in the pipeline.

**Scope:** `custom_field_definitions` table, JSONB column on prospects, field builder UI in settings, dynamic rendering + filtering.

---

### 11. Client Reporting Portal

Generate a shareable, read-only link for a specific client (prospect or group of prospects). The link requires no login and shows a filtered view of that client's pipeline status — useful for agencies reporting progress to their own clients.

**Scope:** `report_tokens` table, public `/report/[token]` route, read-only UI (no edits, no other org data).

---

### 12. Zapier / Webhook Integration

Fire an HTTP POST to a user-configured URL when a prospect hits a specific status (e.g. "Booked"). Payload includes prospect fields. Allows connecting to Zapier, Make, or any custom automation. Admins configure webhooks in settings.

**Scope:** `webhooks` table, settings UI, `triggerWebhooks` helper called inside relevant server actions, retry logic for failed deliveries.

---

### 13. White-Label Support

Allow resellers to host ReachFlow under their own domain with their own logo, brand colours, and "powered by" attribution removed. Each white-label tenant has a custom domain mapping and brand config stored in the DB. Required to sell the product to agencies who want to resell it to their own clients.

**Scope:** `white_label_configs` table, domain verification flow, CSS variable overrides per-tenant, middleware to resolve tenant from hostname.
