# Phase 5 — AI outreach generator

**Goal:** Integrate the Anthropic API to generate personalized outreach messages for each prospect. This is the product's core differentiator — it has to feel magical and reliable.

## Prerequisite

Phase 4 complete. Prospects CRUD works. Detail panel renders. Messages table exists (from Phase 3) but is empty.

## Scope

### 1. Anthropic client setup

Install the official SDK:
```bash
npm install @anthropic-ai/sdk
```

Create `/lib/anthropic/client.ts`:
- Server-only module (add `"server-only"` import at top)
- Exports configured Anthropic client using `ANTHROPIC_API_KEY` from env
- Default model: `claude-sonnet-4-20250514`

### 2. Prompt engineering

Create `/lib/anthropic/prompts.ts` with prompt builders for each message type.

**Key principles for every prompt:**
- Establish VeilCode-style agency context OR let user pass their own agency context (future-proofing — this product will be sold to multiple agencies, so the agency name/services must be configurable, not hardcoded)
- Feed in prospect data: business name, industry, location, platform, notes
- Include explicit constraints: word count, tone, structure, CTA
- Ask for plain text output only — no markdown formatting

**Prompt types:**

**`buildInstagramDmPrompt(agency, prospect, extraContext?)`**
- Max 100 words
- Conversational, direct
- No subject line
- Lead with prospect-specific observation (from notes)
- One low-friction CTA (question, not meeting request)

**`buildColdEmailPrompt(agency, prospect, extraContext?)`**
- Subject line + body separated clearly (use `---SUBJECT---` and `---BODY---` delimiters for parsing)
- 120–150 word body
- Subject under 8 words, benefit-led
- Formal but not corporate
- Clear single CTA

**`buildFollowUpPrompt(agency, prospect, previousMessageContent, daysSince)`**
- Reference the previous message naturally
- Acknowledge it's a follow-up without being defensive
- Add new value or angle (don't just "bump")
- Keep under 60 words
- Soft CTA

**`buildCustomPrompt(agency, prospect, userInstructions)`**
- User provides custom instructions
- Still injects prospect context
- Respects length and tone from user input

### 3. Agency profile

Since this is multi-tenant, each user needs to configure their own agency profile. Extend Phase 3's `profiles` table:

Add columns (via new migration `0002_agency_profile.sql`):
```sql
ALTER TABLE profiles ADD COLUMN agency_services text[];
ALTER TABLE profiles ADD COLUMN agency_website text;
ALTER TABLE profiles ADD COLUMN agency_value_props text;
ALTER TABLE profiles ADD COLUMN sender_name text;
```

Build `/app/(dashboard)/settings/agency/page.tsx` — form to fill in agency details. These get injected into every AI prompt.

### 4. API route

Create `/app/api/generate/route.ts`:

- POST endpoint
- Body: `{ prospectId, messageType, customInstructions? }`
- Authenticates the user via Supabase session (reject if no session)
- Verifies the prospect belongs to the authenticated user (RLS backstop)
- Fetches prospect, user's agency profile, and previous message (for follow-ups)
- Calls Anthropic API with appropriate prompt
- Returns: `{ content, subject?, usage: { input_tokens, output_tokens } }`
- Saves the generated message to the `messages` table with `was_sent=false`

**Error handling:**
- Anthropic API errors: return user-friendly error, don't leak stack traces
- Rate limit: return 429 with retry-after header
- Missing agency profile: return 400 with clear "Set up your agency profile first" message

### 5. UI integration

In the prospect detail panel, add a "Generate message" section:

**Layout:**
- Message type selector (Instagram DM / Cold email / Follow-up / Custom)
- If "Custom": show textarea for user instructions
- "Generate" button
- Output area (scrollable, max-height 400px)
- Three actions on generated message:
  - **Copy** (to clipboard, shows confirmation)
  - **Regenerate** (re-runs with different output)
  - **Mark as sent** (updates the message record, sets prospect status to "sent" if not already, updates `last_contacted_at`)

**During generation:**
- Button shows spinner, disabled
- Optional: streaming response if using Anthropic streaming endpoint (stretch goal — can implement in Phase 6)

**After generation:**
- Show token usage subtly below output (so users see cost implications)
- Output streams in with a typewriter-style animation (custom CSS, not Framer Motion yet)

### 6. Message history

Extend the detail panel's message history section (from Phase 4 placeholder):
- List past generated messages in reverse chronological order
- Each entry shows: type, timestamp, first 80 chars, "was_sent" badge if sent
- Click to expand full message
- Actions per entry: copy, mark as sent, delete

### 7. Settings integration

Update `/app/(dashboard)/settings/page.tsx` to show:
- Profile info
- Agency profile section (with link to dedicated page)
- Theme preference
- Sign out

### 8. Guard rails

- If agency profile is incomplete when user clicks "Generate", open a modal: "Set up your agency profile first" with a direct link to the settings page
- Rate limit generations per user (e.g., 50/day on a free tier — implement a simple Supabase-backed counter)
- Log every generation to a `generation_logs` table (prospect_id, user_id, message_type, tokens_used, timestamp) for cost tracking

Add `generation_logs` migration:
```sql
CREATE TABLE generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  message_type text NOT NULL,
  input_tokens int NOT NULL,
  output_tokens int NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own logs" ON generation_logs FOR SELECT USING (auth.uid() = user_id);
```

### 9. Prompt quality testing

Before marking complete, test with 5 different prospect profiles across different industries:
- A plumber with no website
- A SaaS startup with poor conversion
- A D2C brand on Instagram
- A restaurant without a booking system
- A law firm with outdated design

For each, generate all three message types. Evaluate:
- Is it actually personalized, or generic?
- Does it feel human, or AI-slop?
- Is it the right length?
- Is the CTA clear?

If outputs feel generic, iterate on prompts before shipping.

## Acceptance criteria

- [ ] User can generate Instagram DMs, cold emails, and follow-ups for any prospect
- [ ] Agency profile must be complete before generation (enforced in UI)
- [ ] Messages save to the database automatically
- [ ] Copy-to-clipboard works
- [ ] Regenerate produces meaningfully different output
- [ ] Mark as sent updates the prospect record
- [ ] Message history displays correctly in detail panel
- [ ] Rate limiting works (test by generating rapidly)
- [ ] Token usage logged to generation_logs
- [ ] Errors handled gracefully (API down, no session, incomplete profile)
- [ ] Generated content feels genuinely personalized (tested on 5 sample profiles)
- [ ] No Anthropic API key leaked to client (check network tab)

## What NOT to do in Phase 5

- Do NOT build advanced animations yet (Phase 6)
- Do NOT implement streaming responses (stretch goal, Phase 6 if time)
- Do NOT build team/sharing features
- Do NOT add A/B testing of prompts

## Report back

1. Sample outputs (3 per message type) across different industries
2. Average tokens per generation
3. Estimated cost per user per month at different usage levels
4. Any prompt iterations needed to hit quality bar

Commit as `phase-5-complete`.
