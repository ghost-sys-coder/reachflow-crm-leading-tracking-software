# Hosted Forms Implementation

## Delivered scope

- Admin-only form builder at `/forms` with public title, description, field selection, required-field rules, platform default, consent statement, button label, and success message.
- Draft, publish, pause, open, copy-link, embeddable iframe, and destructive-delete controls.
- Public form at `/f/{slug}` with responsive fields, inline loading/error/success states, and no native browser alerts.
- Server-side submission endpoint at `/api/forms/{slug}/submit`.
- Honeypot spam defense and a five-submissions-per-minute hashed-IP limit. Raw IP addresses are not stored.
- Shared lead-ingestion processing: normalization, matching, fill-empty enrichment, prospect creation, attribution, automation, and outbound `prospect.created` webhook behavior.
- Consent evidence linked to the resulting prospect plus an admin submission ledger.

## Data flow

1. An administrator creates a form. ReachFlow creates a dedicated `hosted_form` lead source behind it.
2. A visitor submits the public form and explicitly accepts the configured consent statement.
3. ReachFlow stores an immutable ingestion event and a submission/audit record.
4. The existing ingestion engine matches the lead or creates a prospect, records attribution, and runs the prospect-created lifecycle only for genuinely new prospects.
5. The Forms page shows the outcome and links to the resulting prospect.

## Required environment

- `NEXT_PUBLIC_APP_URL` is used for share and embed URLs.
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are used only server-side for public intake.
- `WEBHOOK_ENCRYPTION_KEY` is mixed into the one-way IP fingerprint used for rate limiting.

## Deferred external scope

Meta Lead Ads remains the external portion of roadmap feature 19. It requires a Meta developer app, production permissions, OAuth credentials, webhook verification, Page/form subscriptions, token refresh, and provider-specific health monitoring. None of those connections or credentials are required for hosted forms.
