import { z } from "zod"

import {
  CAMPAIGN_STATUSES,
  MEMBER_ROLES,
  MESSAGE_TYPES,
  MESSAGE_DIRECTIONS,
  CALL_OUTCOMES,
  REPLY_INTENTS,
  PLATFORMS,
  PROSPECT_STATUSES,
  THEMES,
} from "@/db/schema"

//re-export enums so callers import one place
export { CAMPAIGN_STATUSES, MEMBER_ROLES, MESSAGE_TYPES, PLATFORMS, PROSPECT_STATUSES, THEMES }

export const memberRoleSchema = z.enum(MEMBER_ROLES)

// Still validates standard platforms; extended to accept custom org-defined values
export const platformSchema = z.string().trim().min(1, "Platform is required").max(50)
export const prospectStatusSchema = z.enum(PROSPECT_STATUSES)
export const messageTypeSchema = z.enum(MESSAGE_TYPES)
export const messageDirectionSchema = z.enum(MESSAGE_DIRECTIONS)
export const callOutcomeSchema = z.enum(CALL_OUTCOMES)
export const replyIntentSchema = z.enum(REPLY_INTENTS)
export const themeSchema = z.enum(THEMES)

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v))

const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v))

const prospectFieldsSchema = z.object({
  business_name: z.string().trim().min(1, "Business name is required").max(200),
  platform: platformSchema,
  handle: optionalTrimmedString(200),
  phone_number: optionalTrimmedString(30),
  industry: optionalTrimmedString(100),
  location: optionalTrimmedString(200),
  state: optionalTrimmedString(100),
  country: optionalTrimmedString(100),
  website_url: optionalUrl,
  status: prospectStatusSchema.default("sent"),
  notes: optionalTrimmedString(2000),
  follow_up_at: z.coerce.date().optional(),
  campaign_ids: z.array(z.string().uuid()).max(50).optional(),
})

export const prospectCreateSchema = prospectFieldsSchema.extend({
  initial_message: optionalTrimmedString(5000),
})

export const prospectUpdateSchema = prospectFieldsSchema.partial()

export const prospectStatusUpdateSchema = z.object({
  status: prospectStatusSchema,
})

export const messageCreateSchema = z.object({
  prospect_id: z.string().uuid(),
  message_type: messageTypeSchema,
  content: z.string().trim().min(1).max(5000),
  subject: optionalTrimmedString(200),
  recorded_at: z.coerce.date().optional(),
})

export const callRecordSchema = messageCreateSchema.extend({
  message_type: z.literal("call_note"),
  call_outcome: callOutcomeSchema,
  call_duration_seconds: z.number().int().min(0).max(86_400).optional(),
  callback_at: z.coerce.date().optional(),
  next_action: optionalTrimmedString(500),
}).superRefine((value, context) => {
  if (value.call_outcome === "callback_requested" && !value.callback_at) {
    context.addIssue({ code: "custom", path: ["callback_at"], message: "A callback date is required" })
  }
})

export const replyRecordSchema = z.object({
  prospect_id: z.string().uuid(),
  message_type: messageTypeSchema,
  content: z.string().trim().min(1).max(5000),
  subject: optionalTrimmedString(200),
  reply_intent: replyIntentSchema,
  objection_code: optionalTrimmedString(100),
  revisit_at: z.coerce.date().optional(),
  received_at: z.coerce.date().optional(),
}).superRefine((value, context) => {
  if (value.reply_intent === "not_now" && !value.revisit_at) {
    context.addIssue({ code: "custom", path: ["revisit_at"], message: "A revisit date is required" })
  }
  if (value.reply_intent === "disqualified" && !value.objection_code) {
    context.addIssue({ code: "custom", path: ["objection_code"], message: "A disqualification reason is required" })
  }
})

export const tagCreateSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().trim().max(30).default("gray"),
})

const campaignBaseSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required").max(150),
  description: optionalTrimmedString(1000),
  status: z.enum(CAMPAIGN_STATUSES).default("draft"),
  channel: optionalTrimmedString(50),
  goal: optionalTrimmedString(500),
  budget_cents: z.number().int().min(0).nullable().optional(),
  currency: z.string().trim().toUpperCase().length(3).default("USD"),
  owner_id: z.string().uuid().nullable().optional(),
  start_at: z.coerce.date().nullable().optional(),
  end_at: z.coerce.date().nullable().optional(),
})

export const campaignSchema = campaignBaseSchema
  .refine(
    (data) => !data.start_at || !data.end_at || data.end_at >= data.start_at,
    { message: "End date must be on or after the start date", path: ["end_at"] },
  )

export const campaignUpdateSchema = campaignBaseSchema.partial().refine(
  (data) => !data.start_at || !data.end_at || data.end_at >= data.start_at,
  { message: "End date must be on or after the start date", path: ["end_at"] },
)
export const campaignMembershipSchema = z.object({
  prospect_ids: z.array(z.string().uuid()).min(1).max(500),
})

export const profileUpdateSchema = z.object({
  full_name: optionalTrimmedString(120),
  job_title: optionalTrimmedString(120),
  theme_preference: themeSchema.optional(),
})

export const agencyProfileUpdateSchema = z.object({
  agency_name: optionalTrimmedString(120),
  sender_name: optionalTrimmedString(120),
  agency_website: optionalUrl,
  agency_value_props: optionalTrimmedString(2000),
  agency_services: z
    .array(z.string().trim().min(1).max(60))
    .max(12)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
})

const generatableMessageTypeSchema = z.enum(["instagram_dm", "cold_email", "follow_up", "custom"])

export const generateMessageSchema = z.object({
  prospectId: z.string().uuid(),
  messageType: generatableMessageTypeSchema,
  customInstructions: z.string().trim().max(2000).optional(),
})

export const themeUpdateSchema = z.object({
  theme_preference: themeSchema,
})

export const templateCreateSchema = z.object({
  name:         z.string().trim().min(1, "Name required").max(100),
  message_type: messageTypeSchema,
  subject:      optionalTrimmedString(200),
  body:         z.string().trim().min(1, "Body required").max(5000),
})

export const templateUpdateSchema = templateCreateSchema.partial()

export type TemplateCreateInput = z.infer<typeof templateCreateSchema>
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>

export const inviteCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email required"),
  role: memberRoleSchema.default("viewer"),
})

export const memberRoleUpdateSchema = z.object({
  role: memberRoleSchema,
})

export type ProspectCreateInput = z.infer<typeof prospectCreateSchema>
export type ProspectUpdateInput = z.infer<typeof prospectUpdateSchema>
export type ProspectStatusUpdateInput = z.infer<typeof prospectStatusUpdateSchema>
export type MessageCreateInput = z.infer<typeof messageCreateSchema>
export type CallRecordInput = z.infer<typeof callRecordSchema>
export type ReplyRecordInput = z.infer<typeof replyRecordSchema>
export type TagCreateInput = z.infer<typeof tagCreateSchema>
export type CampaignInput = z.infer<typeof campaignSchema>
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>
export const orgUpdateSchema = agencyProfileUpdateSchema

export const whiteLabelSchema = z.object({
  white_label_enabled: z.boolean(),
  brand_primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  brand_accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type ThemeUpdateInput = z.infer<typeof themeUpdateSchema>
export type AgencyProfileUpdateInput = z.infer<typeof agencyProfileUpdateSchema>
export type OrgUpdateInput = z.infer<typeof orgUpdateSchema>
export type GenerateMessageInput = z.infer<typeof generateMessageSchema>
export type InviteCreateInput = z.infer<typeof inviteCreateSchema>
export type MemberRoleUpdateInput = z.infer<typeof memberRoleUpdateSchema>
export type WhiteLabelInput = z.infer<typeof whiteLabelSchema>
