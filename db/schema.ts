import { relations, sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
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

export const PLATFORMS = ["instagram", "email", "facebook", "linkedin", "twitter", "other"] as const
export const PROSPECT_STATUSES = ["sent", "waiting", "replied", "booked", "closed", "dead"] as const
export const MESSAGE_TYPES = ["instagram_dm", "cold_email", "follow_up", "custom"] as const
export const THEMES = ["default", "midnight", "sunset"] as const
export const MEMBER_ROLES = ["admin", "editor", "viewer"] as const

export type Platform = (typeof PLATFORMS)[number]
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]
export type MessageType = (typeof MESSAGE_TYPES)[number]
export type ThemePreference = (typeof THEMES)[number]
export type MemberRole = (typeof MEMBER_ROLES)[number]

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
    industry: text(),
    location: text(),
    website_url: text(),
    status: text().notNull().default("sent"),
    notes: text(),
    assigned_to: uuid().references(() => profiles.id, { onDelete: "set null" }),
    follow_up_at: timestamp({ withTimezone: true }),
    last_contacted_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("prospects_org_idx").on(table.org_id),
    index("prospects_org_status_idx").on(table.org_id, table.status),
    index("prospects_org_created_idx").on(table.org_id, table.created_at),
    index("prospects_assigned_to_idx").on(table.assigned_to),
    check(
      "prospects_platform_valid",
      sql`${table.platform} IN ('instagram', 'email', 'facebook', 'linkedin', 'twitter', 'other')`,
    ),
    check(
      "prospects_status_valid",
      sql`${table.status} IN ('sent', 'waiting', 'replied', 'booked', 'closed', 'dead')`,
    ),
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
    was_sent: boolean().notNull().default(false),
    sent_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_org_idx").on(table.org_id),
    index("messages_prospect_idx").on(table.prospect_id),
    index("messages_user_idx").on(table.user_id),
    check(
      "messages_type_valid",
      sql`${table.message_type} IN ('instagram_dm', 'cold_email', 'follow_up', 'custom')`,
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
      sql`${table.message_type} IN ('instagram_dm', 'cold_email', 'follow_up', 'custom')`,
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

// relations

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  invites: many(organizationInvites),
  prospects: many(prospects),
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
