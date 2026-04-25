# Phase 3 — Database schema & data layer

**Goal:** Design and implement the full Supabase Postgres schema with Row Level Security. Build typed server actions for all CRUD operations. Seed with sample data. No UI work.

## Prerequisite

Phase 2 complete and committed. Design system working across all three themes.

## Scope

### 1. Supabase project setup

If not already done:
- Create a new Supabase project
- Copy the project URL and anon key into `.env.local`
- Enable email auth in Supabase Auth settings
- Configure redirect URLs for local development (`http://localhost:3000/**`)

### 2. Database schema

Write a single SQL migration file: `supabase/migrations/0001_initial_schema.sql`

Tables required:

**`profiles`** (extends auth.users)
```sql
- id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
- full_name text
- agency_name text
- theme_preference text DEFAULT 'default' CHECK (theme_preference IN ('default', 'midnight', 'sunset'))
- created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()
```

**`prospects`**
```sql
- id uuid PRIMARY KEY DEFAULT gen_random_uuid()
- user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
- business_name text NOT NULL
- platform text NOT NULL CHECK (platform IN ('instagram', 'email', 'facebook', 'linkedin', 'twitter', 'other'))
- handle text          → @handle or email address
- industry text
- location text
- website_url text
- status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'waiting', 'replied', 'booked', 'closed', 'dead'))
- notes text
- follow_up_at timestamptz
- last_contacted_at timestamptz
- created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()
```

**`messages`** (stores generated and sent outreach messages for history)
```sql
- id uuid PRIMARY KEY DEFAULT gen_random_uuid()
- prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE
- user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
- message_type text NOT NULL CHECK (message_type IN ('instagram_dm', 'cold_email', 'follow_up', 'custom'))
- content text NOT NULL
- subject text            → nullable, only for email
- was_sent boolean DEFAULT false
- sent_at timestamptz
- created_at timestamptz DEFAULT now()
```

**`tags`** (for prospect categorization)
```sql
- id uuid PRIMARY KEY DEFAULT gen_random_uuid()
- user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
- name text NOT NULL
- color text DEFAULT 'gray'
- created_at timestamptz DEFAULT now()
- UNIQUE(user_id, name)
```

**`prospect_tags`** (junction table)
```sql
- prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE
- tag_id uuid REFERENCES tags(id) ON DELETE CASCADE
- PRIMARY KEY (prospect_id, tag_id)
```

### 3. Row Level Security

Enable RLS on every table. Write policies that enforce users can only read/write their own rows.

Example pattern (apply to all tables):
```sql
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prospects" ON prospects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prospects" ON prospects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prospects" ON prospects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prospects" ON prospects
  FOR DELETE USING (auth.uid() = user_id);
```

### 4. Auto-profile creation trigger

Create a trigger so that when a user signs up via Supabase Auth, a matching row in `profiles` is created automatically:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 5. `updated_at` triggers

Add a generic `moddatetime` trigger to auto-update `updated_at` on row changes for `profiles` and `prospects`.

### 6. TypeScript types

Generate types from the Supabase schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > /types/supabase.ts
```

Create `/types/database.ts` that re-exports and extends the generated types with app-specific types (e.g. `Prospect`, `ProspectWithTags`, `MessageWithProspect`).

### 7. Server Actions

Create `/app/actions/` with these files:

**`prospects.ts`** — server actions
- `createProspect(data)`
- `updateProspect(id, data)`
- `deleteProspect(id)`
- `updateProspectStatus(id, status)`
- `getProspects(filters?: { status?, platform?, search? })`
- `getProspectById(id)`

**`messages.ts`** — server actions
- `saveMessage(prospectId, content, type, subject?)`
- `markMessageAsSent(messageId)`
- `getMessagesForProspect(prospectId)`

**`tags.ts`** — server actions
- `createTag(name, color)`
- `deleteTag(id)`
- `addTagToProspect(prospectId, tagId)`
- `removeTagFromProspect(prospectId, tagId)`
- `getUserTags()`

**`profile.ts`** — server actions
- `getCurrentProfile()`
- `updateProfile(data)`
- `updateThemePreference(theme)`

All actions:
- Use the Supabase server client
- Validate input with Zod schemas (install `zod`: `npm install zod`)
- Return a consistent shape: `{ data, error }` 
- Call `revalidatePath` on relevant paths after mutations

### 8. Zod schemas

Create `/lib/validation/schemas.ts` with Zod schemas for every input type:

```ts
export const prospectCreateSchema = z.object({
  business_name: z.string().min(1).max(200),
  platform: z.enum(['instagram', 'email', 'facebook', 'linkedin', 'twitter', 'other']),
  handle: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  website_url: z.string().url().optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
});
```

### 9. Seed data

Create `supabase/seed.sql` with sample data for local testing — 10 sample prospects across different industries, platforms, and statuses. This should be idempotent (safe to re-run).

### 10. Update sign-up flow

Now that profiles are created via trigger, verify that the sign-up page redirects properly after account creation and that the profile row exists.

## Acceptance criteria

- [ ] Migration runs cleanly on a fresh Supabase project
- [ ] RLS policies tested: user A cannot read user B's prospects (test by signing in as two users)
- [ ] Auto-profile trigger works: signing up creates a matching profiles row
- [ ] All server actions compile without TypeScript errors
- [ ] Zod validation rejects invalid input (test with bad data)
- [ ] `updated_at` automatically updates on row changes
- [ ] Seed data loads into a test account correctly
- [ ] No exposed service_role key — only anon key used in client code

## What NOT to do in Phase 3

- Do NOT build UI for prospects yet (that's Phase 4)
- Do NOT integrate the Anthropic API (Phase 5)
- Do NOT add optimistic updates yet (Phase 6)
- Do NOT add realtime subscriptions yet

## Report back

1. SQL migration file contents
2. Output of `supabase db diff` showing clean migration
3. Test results proving RLS isolation between users
4. Any schema deviations and why

Commit as `phase-3-complete`.
