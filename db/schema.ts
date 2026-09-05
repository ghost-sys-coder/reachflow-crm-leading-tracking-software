import { relations, sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

const authSchema = pgSchema("auth")
const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
})

export const PLATFORMS = ["instagram", "email", "whatsapp", "facebook", "linkedin", "x", "call", "other"] as const
export const PROSPECT_STATUSES = ["sent", "waiting", "replied", "booked", "closed", "dead"] as const
export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed", "archived"] as const
export const MESSAGE_TYPES = [
  "instagram_dm",
  "cold_email",
  "whatsapp_message",
  "facebook_message",
  "linkedin_message",
  "x_message",
  "call_note",
  "follow_up",
  "custom",
] as const
export const MESSAGE_DIRECTIONS = ["outbound", "inbound"] as const
export const CALL_OUTCOMES = ["connected", "no_answer", "voicemail", "callback_requested", "wrong_number", "disqualified"] as const
export const REPLY_INTENTS = ["interested", "not_now", "not_interested", "question", "wrong_contact", "disqualified"] as const
export const THEMES = ["default", "midnight", "sunset"] as const
export const MEMBER_ROLES = ["admin", "editor", "viewer"] as const
export const NOTIFICATION_TYPES = ["prospect_assigned", "status_changed", "follow_up_due", "gmail_reply"] as const
export const ACTIVITY_ACTIONS = [
  "prospect_created",
  "status_changed",
  "assignee_changed",
  "note_updated",
  "prospect_updated",
  "message_saved",
  "outreach_sent",
  "reply_received",
] as const

export type Platform = (typeof PLATFORMS)[number]
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]
export type MessageType = (typeof MESSAGE_TYPES)[number]
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number]
export type CallOutcome = (typeof CALL_OUTCOMES)[number]
export type ReplyIntent = (typeof REPLY_INTENTS)[number]
export type ThemePreference = (typeof THEMES)[number]
export type MemberRole = (typeof MEMBER_ROLES)[number]
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number]

export const profiles = pgTable(
  "profiles",
  {
    id: uuid()
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    full_name: text(),
    job_title: text(),
    avatar_url: text(),
    theme_preference: text().notNull().default("default"),
    follow_up_digest: boolean().notNull().default(true),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "profiles_theme_valid",
      sql`${table.theme_preference} IN ('default', 'midnight', 'sunset')`,
    ),
  ],
)

export const organizations = pgTable("organizations", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  plan: text().notNull().default("free"),
  agency_name: text(),
  sender_name: text(),
  agency_website: text(),
  agency_value_props: text(),
  agency_services: text().array(),
  logo_url: text(),
  white_label_enabled: boolean().notNull().default(false),
  brand_primary_color: text(),
  brand_accent_color: text(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    user_id: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text().notNull().default("viewer"),
    invited_by: uuid().references(() => profiles.id, { onDelete: "set null" }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("org_members_org_user_uq").on(table.org_id, table.user_id),
    index("org_members_org_idx").on(table.org_id),
    index("org_members_user_idx").on(table.user_id),
    check("org_members_role_valid", sql`${table.role} IN ('admin', 'editor', 'viewer')`),
  ],
)

export const organizationInvites = pgTable(
  "organization_invites",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text().notNull(),
    role: text().notNull().default("viewer"),
    token: text().notNull().unique(),
    expires_at: timestamp({ withTimezone: true }).notNull(),
    created_by: uuid().references(() => profiles.id, { onDelete: "set null" }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("org_invites_org_idx").on(table.org_id),
    index("org_invites_token_idx").on(table.token),
    check("org_invites_role_valid", sql`${table.role} IN ('admin', 'editor', 'viewer')`),
  ],
)

export const prospects = pgTable(
  "prospects",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    business_name: text().notNull(),
    platform: text().notNull(),
    handle: text(),
    phone_number: text(),
    industry: text(),
    location: text(),
    state: text(),
    country: text(),
    website_url: text(),
    status: text().notNull().default("sent"),
    notes: text(),
    assigned_to: uuid().references(() => profiles.id, { onDelete: "set null" }),
    follow_up_at: timestamp({ withTimezone: true }),
    snoozed_until: timestamp({ withTimezone: true }),
    snooze_reason: text(),
    last_contacted_at: timestamp({ withTimezone: true }),
    last_reply_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("prospects_org_idx").on(table.org_id),
    index("prospects_org_status_idx").on(table.org_id, table.status),
    index("prospects_org_created_idx").on(table.org_id, table.created_at),
    index("prospects_assigned_to_idx").on(table.assigned_to),
    check(
      "prospects_status_valid",
      sql`${table.status} IN ('sent', 'waiting', 'replied', 'booked', 'closed', 'dead')`,
    ),
  ],
)

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text(),
    status: text().notNull().default("draft"),
    channel: text(),
    goal: text(),
    budget_cents: integer(),
    currency: text().notNull().default("USD"),
    owner_id: uuid().references(() => profiles.id, { onDelete: "set null" }),
    start_at: timestamp({ withTimezone: true }),
    end_at: timestamp({ withTimezone: true }),
    created_by: uuid().references(() => profiles.id, { onDelete: "set null" }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("campaigns_org_idx").on(table.org_id),
    index("campaigns_org_status_idx").on(table.org_id, table.status),
    index("campaigns_owner_idx").on(table.owner_id),
    check(
      "campaigns_status_valid",
      sql`${table.status} IN ('draft', 'active', 'paused', 'completed', 'archived')`,
    ),
    check("campaigns_budget_nonnegative", sql`${table.budget_cents} IS NULL OR ${table.budget_cents} >= 0`),
    check("campaigns_dates_valid", sql`${table.end_at} IS NULL OR ${table.start_at} IS NULL OR ${table.end_at} >= ${table.start_at}`),
  ],
)

export const campaignProspects = pgTable(
  "campaign_prospects",
  {
    campaign_id: uuid()
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    prospect_id: uuid()
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    added_by: uuid().references(() => profiles.id, { onDelete: "set null" }),
    added_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.campaign_id, table.prospect_id] }),
    index("campaign_prospects_prospect_idx").on(table.prospect_id),
  ],
)

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    prospect_id: uuid()
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    user_id: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    message_type: text().notNull(),
    content: text().notNull(),
    subject: text(),
    direction: text().notNull().default("outbound"),
    call_outcome: text(),
    call_duration_seconds: integer(),
    callback_at: timestamp({ withTimezone: true }),
    next_action: text(),
    reply_intent: text(),
    objection_code: text(),
    recorded_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    was_sent: boolean().notNull().default(false),
    sent_at: timestamp({ withTimezone: true }),
    provider: text(),
    provider_message_id: text(),
    provider_thread_id: text(),
    internet_message_id: text(),
    in_reply_to: text(),
    references_header: text(),
    sender_email: text(),
    recipient_emails: text().array(),
    cc_emails: text().array(),
    snippet: text(),
    gmail_label_ids: text().array(),
    is_read: boolean().notNull().default(true),
    synced_at: timestamp({ withTimezone: true }),
    connection_id: uuid(),
    delivery_status: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_org_idx").on(table.org_id),
    index("messages_prospect_idx").on(table.prospect_id),
    index("messages_user_idx").on(table.user_id),
    index("messages_org_direction_recorded_idx").on(table.org_id, table.direction, table.recorded_at),
    index("messages_org_call_outcome_idx").on(table.org_id, table.call_outcome),
    index("messages_org_reply_intent_idx").on(table.org_id, table.reply_intent),
    check(
      "messages_type_valid",
      sql`${table.message_type} IN ('instagram_dm', 'cold_email', 'whatsapp_message', 'facebook_message', 'linkedin_message', 'x_message', 'call_note', 'follow_up', 'custom')`,
    ),
  ],
)

export const tags = pgTable(
  "tags",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text().notNull(),
    color: text().notNull().default("gray"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tags_org_idx").on(table.org_id),
    unique("tags_org_name_uq").on(table.org_id, table.name),
  ],
)

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text().notNull(),
    message_type: text().notNull(),
    subject: text(),
    body: text().notNull(),
    created_by: uuid().references(() => profiles.id, { onDelete: "set null" }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("message_templates_org_idx").on(table.org_id),
    check(
      "message_templates_type_valid",
      sql`${table.message_type} IN ('instagram_dm', 'cold_email', 'whatsapp_message', 'facebook_message', 'linkedin_message', 'x_message', 'call_note', 'follow_up', 'custom')`,
    ),
  ],
)

export const generationLogs = pgTable(
  "generation_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    prospect_id: uuid().references(() => prospects.id, { onDelete: "set null" }),
    message_type: text().notNull(),
    input_tokens: integer().notNull(),
    output_tokens: integer().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("generation_logs_org_idx").on(table.org_id),
    index("generation_logs_org_created_idx").on(table.org_id, table.created_at),
    check(
      "generation_logs_type_valid",
      sql`${table.message_type} IN ('instagram_dm', 'cold_email', 'whatsapp_message', 'facebook_message', 'linkedin_message', 'x_message', 'call_note', 'follow_up', 'custom')`,
    ),
  ],
)

export const prospectTags = pgTable(
  "prospect_tags",
  {
    prospect_id: uuid()
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    tag_id: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.prospect_id, table.tag_id] })],
)

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    user_id: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    actor_id: uuid().references(() => profiles.id, { onDelete: "set null" }),
    type: text().notNull(),
    subject_id: uuid(),
    message: text().notNull(),
    read_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_idx").on(table.user_id),
    index("notifications_user_read_idx").on(table.user_id, table.read_at),
    index("notifications_org_idx").on(table.org_id),
    check(
      "notifications_type_valid",
      sql`${table.type} IN ('prospect_assigned', 'status_changed', 'follow_up_due')`,
    ),
  ],
)

export const sequences = pgTable(
  "sequences",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text(),
    created_by: uuid().references(() => profiles.id, { onDelete: "set null" }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sequences_org_idx").on(table.org_id)],
)

export const sequenceSteps = pgTable(
  "sequence_steps",
  {
    id: uuid().primaryKey().defaultRandom(),
    sequence_id: uuid().notNull().references(() => sequences.id, { onDelete: "cascade" }),
    step_number: integer().notNull(),
    delay_days: integer().notNull().default(0),
    message_type: text().notNull(),
    subject: text(),
    body_template: text().notNull().default(""),
  },
  (table) => [
    index("sequence_steps_seq_idx").on(table.sequence_id),
    unique("sequence_steps_seq_step_uq").on(table.sequence_id, table.step_number),
    check("sequence_steps_type_valid", sql`${table.message_type} IN ('instagram_dm','cold_email','whatsapp_message','facebook_message','linkedin_message','x_message','call_note','follow_up','custom')`),
    check("sequence_steps_delay_check", sql`${table.delay_days} >= 0`),
    check("sequence_steps_step_check", sql`${table.step_number} >= 1`),
  ],
)

export const prospectSequences = pgTable(
  "prospect_sequences",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
    prospect_id: uuid().notNull().references(() => prospects.id, { onDelete: "cascade" }),
    sequence_id: uuid().notNull().references(() => sequences.id, { onDelete: "cascade" }),
    enrolled_by: uuid().references(() => profiles.id, { onDelete: "set null" }),
    started_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    status: text().notNull().default("active"),
  },
  (table) => [
    index("prospect_sequences_prospect_idx").on(table.prospect_id),
    index("prospect_sequences_org_idx").on(table.org_id),
    check("prospect_sequences_status_valid", sql`${table.status} IN ('active','paused','completed','cancelled')`),
  ],
)

export const prospectSequenceSteps = pgTable(
  "prospect_sequence_steps",
  {
    id: uuid().primaryKey().defaultRandom(),
    prospect_sequence_id: uuid().notNull().references(() => prospectSequences.id, { onDelete: "cascade" }),
    step_id: uuid().notNull().references(() => sequenceSteps.id, { onDelete: "cascade" }),
    step_number: integer().notNull(),
    due_at: timestamp({ withTimezone: true }).notNull(),
    status: text().notNull().default("pending"),
    completed_at: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("pss_prospect_sequence_idx").on(table.prospect_sequence_id),
    index("pss_due_status_idx").on(table.due_at, table.status),
    check("pss_status_valid", sql`${table.status} IN ('pending','ready','skipped')`),
  ],
)

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    prospect_id: uuid()
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    user_id: uuid().references(() => profiles.id, { onDelete: "set null" }),
    actor_name: text().notNull().default("Team member"),
    action: text().notNull(),
    old_value: text(),
    new_value: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("activity_log_prospect_idx").on(table.prospect_id),
    index("activity_log_org_idx").on(table.org_id),
    check(
      "activity_log_action_valid",
      sql`${table.action} IN ('prospect_created','status_changed','assignee_changed','note_updated','prospect_updated','message_saved','outreach_sent')`,
    ),
  ],
)

export const orgIndustries = pgTable(
  "org_industries",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("org_industries_org_idx").on(table.org_id),
    unique("org_industries_org_name_unique").on(table.org_id, table.name),
  ],
)

export const orgCustomPlatforms = pgTable(
  "org_custom_platforms",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("org_custom_platforms_org_idx").on(table.org_id),
    unique("org_custom_platforms_org_name_unique").on(table.org_id, table.name),
  ],
)

export const gmailConnections = pgTable(
  "gmail_connections",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
    user_id: uuid().notNull().references(() => profiles.id, { onDelete: "cascade" }),
    google_account_id: text().notNull(),
    email_address: text().notNull(),
    access_token_ciphertext: text().notNull(),
    refresh_token_ciphertext: text().notNull(),
    granted_scopes: text().array().notNull().default(sql`ARRAY[]::text[]`),
    status: text().notNull().default("active"),
    token_expires_at: timestamp({ withTimezone: true }),
    last_used_at: timestamp({ withTimezone: true }),
    last_error: text(),
    history_id: text(),
    watch_expiration_at: timestamp({ withTimezone: true }),
    last_synced_at: timestamp({ withTimezone: true }),
    sync_status: text().notNull().default("idle"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("gmail_connections_org_user_uq").on(table.org_id, table.user_id),
    unique("gmail_connections_google_account_uq").on(table.google_account_id),
    index("gmail_connections_org_idx").on(table.org_id),
    check("gmail_connections_status_valid", sql`${table.status} IN ('active','error','revoked')`),
    check("gmail_connections_sync_status_valid", sql`${table.sync_status} IN ('idle','syncing','error')`),
  ],
)

export const whatsappConnections = pgTable(
  "whatsapp_connections",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
    connected_by: uuid().notNull().references(() => profiles.id, { onDelete: "cascade" }),
    business_account_id: text().notNull(),
    phone_number_id: text().notNull(),
    display_phone_number: text(),
    access_token_ciphertext: text(),
    token_expires_at: timestamp({ withTimezone: true }),
    token_issued_at: timestamp({ withTimezone: true }),
    meta_user_id: text(),
    verified_name: text(),
    connection_method: text().notNull().default("environment"),
    granted_scopes: text().array().notNull().default(sql`'{}'::text[]`),
    deauthorized_at: timestamp({ withTimezone: true }),
    status: text().notNull().default("active"),
    last_message_at: timestamp({ withTimezone: true }),
    last_error: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("whatsapp_connections_org_uq").on(table.org_id),
    unique("whatsapp_connections_phone_number_uq").on(table.phone_number_id),
    index("whatsapp_connections_org_idx").on(table.org_id),
    check("whatsapp_connections_status_valid", sql`${table.status} IN ('active','error','revoked')`),
    check("whatsapp_connections_method_valid", sql`${table.connection_method} IN ('environment','embedded_signup')`),
  ],
)

export const whatsappWebhookEvents = pgTable(
  "whatsapp_webhook_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    connection_id: uuid().references(() => whatsappConnections.id, { onDelete: "cascade" }),
    provider_event_id: text().notNull(),
    event_type: text().notNull(),
    payload: jsonb().notNull(),
    status: text().notNull().default("received"),
    last_error: text(),
    processed_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("whatsapp_webhook_events_provider_uq").on(table.provider_event_id, table.event_type),
    index("whatsapp_webhook_events_connection_idx").on(table.connection_id),
    check("whatsapp_webhook_events_status_valid", sql`${table.status} IN ('received','processed','unmatched','failed')`),
  ],
)

export const emailDeliveries = pgTable(
  "email_deliveries",
  {
    id: uuid().primaryKey().defaultRandom(),
    org_id: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
    message_id: uuid().notNull().references(() => messages.id, { onDelete: "cascade" }),
    connection_id: uuid().references(() => gmailConnections.id, { onDelete: "set null" }),
    provider: text().notNull().default("gmail"),
    provider_message_id: text(),
    provider_thread_id: text(),
    idempotency_key: text().notNull(),
    status: text().notNull().default("pending"),
    attempt_count: integer().notNull().default(0),
    last_error: text(),
    sent_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("email_deliveries_idempotency_uq").on(table.idempotency_key),
    index("email_deliveries_org_idx").on(table.org_id),
    index("email_deliveries_message_idx").on(table.message_id),
    check("email_deliveries_status_valid", sql`${table.status} IN ('pending','sending','sent','failed')`),
  ],
)

export const roadmapFeatureProgress = pgTable(
  "roadmap_feature_progress",
  {
    feature_key: text().primaryKey(),
    is_completed: boolean().notNull().default(false),
    implementation_notes: text().notNull().default(""),
    completed_at: timestamp({ withTimezone: true }),
    completed_by: uuid().references(() => profiles.id, { onDelete: "set null" }),
    completed_by_email: text(),
    notes_updated_at: timestamp({ withTimezone: true }),
    notes_updated_by: uuid().references(() => profiles.id, { onDelete: "set null" }),
    notes_updated_by_email: text(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("roadmap_feature_progress_completed_idx").on(table.is_completed),
  ],
)

export const savedViews = pgTable("saved_views", {
  id: uuid().primaryKey().defaultRandom(),
  org_id: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  owner_id: uuid().notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text().notNull(),
  scope: text().notNull().default("private"),
  entity_type: text().notNull().default("prospects"),
  filter_version: integer().notNull().default(1),
  filter_json: jsonb().$type<Record<string, string | boolean>>().notNull().default({}),
  is_default: boolean().notNull().default(false),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("saved_views_org_idx").on(table.org_id, table.entity_type)])

export const tasks = pgTable("tasks", {
  id: uuid().primaryKey().defaultRandom(),
  org_id: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  prospect_id: uuid().references(() => prospects.id, { onDelete: "set null" }),
  campaign_id: uuid().references(() => campaigns.id, { onDelete: "set null" }),
  created_by: uuid().notNull().references(() => profiles.id, { onDelete: "restrict" }),
  assigned_to: uuid().references(() => profiles.id, { onDelete: "set null" }),
  title: text().notNull(),
  description: text(),
  status: text().notNull().default("open"),
  priority: text().notNull().default("normal"),
  due_at: timestamp({ withTimezone: true }),
  completed_at: timestamp({ withTimezone: true }),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("tasks_org_status_due_idx").on(table.org_id, table.status, table.due_at),
  index("tasks_assignee_status_due_idx").on(table.assigned_to, table.status, table.due_at),
  index("tasks_prospect_idx").on(table.prospect_id),
])

export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: uuid().primaryKey().defaultRandom(),
  org_id: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text().notNull(),
  field_type: text().notNull(),
  help_text: text(),
  options: jsonb().$type<string[]>().notNull().default([]),
  validation: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  is_required: boolean().notNull().default(false),
  is_archived: boolean().notNull().default(false),
  display_order: integer().notNull().default(0),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("custom_field_definitions_org_order_idx").on(table.org_id, table.is_archived, table.display_order)])

export const customFieldValues = pgTable("custom_field_values", {
  id: uuid().primaryKey().defaultRandom(),
  org_id: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  prospect_id: uuid().notNull().references(() => prospects.id, { onDelete: "cascade" }),
  definition_id: uuid().notNull().references(() => customFieldDefinitions.id, { onDelete: "cascade" }),
  value: jsonb().$type<string | number | boolean>().notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("custom_field_values_prospect_definition_uq").on(table.prospect_id, table.definition_id), index("custom_field_values_prospect_idx").on(table.prospect_id)])

export const importBatches = pgTable("import_batches", {
  id: uuid().primaryKey().defaultRandom(),
  org_id: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  created_by: uuid().notNull().references(() => profiles.id, { onDelete: "restrict" }),
  filename: text().notNull(),
  mapping: jsonb().$type<Record<string, string>>().notNull().default({}),
  total_rows: integer().notNull(),
  imported_rows: integer().notNull().default(0),
  failed_rows: integer().notNull().default(0),
  errors: jsonb().$type<Array<{ row: number; reason: string }>>().notNull().default([]),
  status: text().notNull().default("processing"),
  rolled_back_at: timestamp({ withTimezone: true }),
  rolled_back_by: uuid().references(() => profiles.id, { onDelete: "set null" }),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  completed_at: timestamp({ withTimezone: true }),
}, (table) => [index("import_batches_org_created_idx").on(table.org_id, table.created_at)])

export const importBatchRows = pgTable("import_batch_rows", {
  id: uuid().primaryKey().defaultRandom(),
  import_batch_id: uuid().notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  prospect_id: uuid().references(() => prospects.id, { onDelete: "set null" }),
  row_number: integer().notNull(),
  operation: text().notNull().default("created"),
  snapshot_before: jsonb().$type<Record<string, unknown>>(),
  snapshot_after: jsonb().$type<Record<string, unknown>>(),
  error: text(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("import_batch_rows_batch_row_uq").on(table.import_batch_id, table.row_number), index("import_batch_rows_batch_idx").on(table.import_batch_id)])

// relations

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  invites: many(organizationInvites),
  prospects: many(prospects),
  campaigns: many(campaigns),
  messages: many(messages),
  tags: many(tags),
  generation_logs: many(generationLogs),
}))

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.org_id],
    references: [organizations.id],
  }),
  user: one(profiles, {
    fields: [organizationMembers.user_id],
    references: [profiles.id],
  }),
}))

export const organizationInvitesRelations = relations(organizationInvites, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationInvites.org_id],
    references: [organizations.id],
  }),
}))

export const profilesRelations = relations(profiles, ({ many }) => ({
  members: many(organizationMembers),
  messages: many(messages),
}))

export const prospectsRelations = relations(prospects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [prospects.org_id],
    references: [organizations.id],
  }),
  messages: many(messages),
  prospect_tags: many(prospectTags),
  campaign_prospects: many(campaignProspects),
}))

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [campaigns.org_id],
    references: [organizations.id],
  }),
  owner: one(profiles, {
    fields: [campaigns.owner_id],
    references: [profiles.id],
  }),
  campaign_prospects: many(campaignProspects),
}))

export const campaignProspectsRelations = relations(campaignProspects, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignProspects.campaign_id],
    references: [campaigns.id],
  }),
  prospect: one(prospects, {
    fields: [campaignProspects.prospect_id],
    references: [prospects.id],
  }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  organization: one(organizations, {
    fields: [messages.org_id],
    references: [organizations.id],
  }),
  prospect: one(prospects, {
    fields: [messages.prospect_id],
    references: [prospects.id],
  }),
  author: one(profiles, {
    fields: [messages.user_id],
    references: [profiles.id],
  }),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tags.org_id],
    references: [organizations.id],
  }),
  prospect_tags: many(prospectTags),
}))

export const generationLogsRelations = relations(generationLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [generationLogs.org_id],
    references: [organizations.id],
  }),
  prospect: one(prospects, {
    fields: [generationLogs.prospect_id],
    references: [prospects.id],
  }),
}))

export const prospectTagsRelations = relations(prospectTags, ({ one }) => ({
  prospect: one(prospects, {
    fields: [prospectTags.prospect_id],
    references: [prospects.id],
  }),
  tag: one(tags, {
    fields: [prospectTags.tag_id],
    references: [tags.id],
  }),
}))

export const sequencesRelations = relations(sequences, ({ one, many }) => ({
  organization: one(organizations, { fields: [sequences.org_id], references: [organizations.id] }),
  steps: many(sequenceSteps),
}))

export const sequenceStepsRelations = relations(sequenceSteps, ({ one }) => ({
  sequence: one(sequences, { fields: [sequenceSteps.sequence_id], references: [sequences.id] }),
}))

export const prospectSequencesRelations = relations(prospectSequences, ({ one, many }) => ({
  organization: one(organizations, { fields: [prospectSequences.org_id], references: [organizations.id] }),
  prospect: one(prospects, { fields: [prospectSequences.prospect_id], references: [prospects.id] }),
  sequence: one(sequences, { fields: [prospectSequences.sequence_id], references: [sequences.id] }),
  steps: many(prospectSequenceSteps),
}))

export const prospectSequenceStepsRelations = relations(prospectSequenceSteps, ({ one }) => ({
  prospectSequence: one(prospectSequences, { fields: [prospectSequenceSteps.prospect_sequence_id], references: [prospectSequences.id] }),
  step: one(sequenceSteps, { fields: [prospectSequenceSteps.step_id], references: [sequenceSteps.id] }),
}))

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  organization: one(organizations, {
    fields: [activityLog.org_id],
    references: [organizations.id],
  }),
  prospect: one(prospects, {
    fields: [activityLog.prospect_id],
    references: [prospects.id],
  }),
  actor: one(profiles, {
    fields: [activityLog.user_id],
    references: [profiles.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.org_id],
    references: [organizations.id],
  }),
  recipient: one(profiles, {
    fields: [notifications.user_id],
    references: [profiles.id],
  }),
  actor: one(profiles, {
    fields: [notifications.actor_id],
    references: [profiles.id],
  }),
}))
