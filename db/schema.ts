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

//reference-only view of Supabase's auth.users so FKs resolve;
//Drizzle will NOT emit DDL for the auth schema
const authSchema = pgSchema("auth")
const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
})

export const PLATFORMS = ["instagram", "email", "facebook", "linkedin", "twitter", "other"] as const
export const PROSPECT_STATUSES = ["sent", "waiting", "replied", "booked", "closed", "dead"] as const
export const MESSAGE_TYPES = ["instagram_dm", "cold_email", "follow_up", "custom"] as const
export const THEMES = ["default", "midnight", "sunset"] as const

export type Platform = (typeof PLATFORMS)[number]
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]
export type MessageType = (typeof MESSAGE_TYPES)[number]
export type ThemePreference = (typeof THEMES)[number]

//field keys match DB columns (snake_case) so Supabase-js responses,
//Drizzle types, Zod schemas, and form data all share one casing
export const profiles = pgTable(
  "profiles",
  {
    id: uuid()
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    full_name: text(),
    agency_name: text(),
    theme_preference: text().notNull().default("default"),
    //agency profile fields injected into every AI prompt
    sender_name: text(),
    agency_website: text(),
    agency_value_props: text(),
    agency_services: text().array(),
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

export const prospects = pgTable(
  "prospects",
  {
    id: uuid().primaryKey().defaultRandom(),
    user_id: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    business_name: text().notNull(),
    platform: text().notNull(),
    handle: text(),
    industry: text(),
    location: text(),
    website_url: text(),
    status: text().notNull().default("sent"),
    notes: text(),
    follow_up_at: timestamp({ withTimezone: true }),
    last_contacted_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("prospects_user_idx").on(table.user_id),
    index("prospects_user_status_idx").on(table.user_id, table.status),
    index("prospects_user_created_idx").on(table.user_id, table.created_at),
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
    user_id: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text().notNull(),
    color: text().notNull().default("gray"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("tags_user_name_uq").on(table.user_id, table.name)],
)

export const generationLogs = pgTable(
  "generation_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    user_id: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    prospect_id: uuid().references(() => prospects.id, { onDelete: "set null" }),
    message_type: text().notNull(),
    input_tokens: integer().notNull(),
    output_tokens: integer().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("generation_logs_user_idx").on(table.user_id),
    index("generation_logs_user_created_idx").on(table.user_id, table.created_at),
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

export const profilesRelations = relations(profiles, ({ many }) => ({
  prospects: many(prospects),
  messages: many(messages),
  tags: many(tags),
  generation_logs: many(generationLogs),
}))

export const generationLogsRelations = relations(generationLogs, ({ one }) => ({
  owner: one(profiles, {
    fields: [generationLogs.user_id],
    references: [profiles.id],
  }),
  prospect: one(prospects, {
    fields: [generationLogs.prospect_id],
    references: [prospects.id],
  }),
}))

export const prospectsRelations = relations(prospects, ({ one, many }) => ({
  owner: one(profiles, { fields: [prospects.user_id], references: [profiles.id] }),
  messages: many(messages),
  prospect_tags: many(prospectTags),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  prospect: one(prospects, {
    fields: [messages.prospect_id],
    references: [prospects.id],
  }),
  owner: one(profiles, { fields: [messages.user_id], references: [profiles.id] }),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  owner: one(profiles, { fields: [tags.user_id], references: [profiles.id] }),
  prospect_tags: many(prospectTags),
}))

export const prospectTagsRelations = relations(prospectTags, ({ one }) => ({
  prospect: one(prospects, {
    fields: [prospectTags.prospect_id],
    references: [prospects.id],
  }),
  tag: one(tags, { fields: [prospectTags.tag_id], references: [tags.id] }),
}))
