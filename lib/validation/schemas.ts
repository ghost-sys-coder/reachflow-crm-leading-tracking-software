import { z } from "zod"

import {
  MEMBER_ROLES,
  MESSAGE_TYPES,
  PLATFORMS,
  PROSPECT_STATUSES,
  THEMES,
} from "@/db/schema"

//re-export enums so callers import one place
export { MEMBER_ROLES, MESSAGE_TYPES, PLATFORMS, PROSPECT_STATUSES, THEMES }

export const memberRoleSchema = z.enum(MEMBER_ROLES)

export const platformSchema = z.enum(PLATFORMS)
export const prospectStatusSchema = z.enum(PROSPECT_STATUSES)
export const messageTypeSchema = z.enum(MESSAGE_TYPES)
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

export const prospectCreateSchema = z.object({
  business_name: z.string().trim().min(1, "Business name is required").max(200),
  platform: platformSchema,
  handle: optionalTrimmedString(200),
  industry: optionalTrimmedString(100),
  location: optionalTrimmedString(200),
  website_url: optionalUrl,
  status: prospectStatusSchema.default("sent"),
  notes: optionalTrimmedString(2000),
  follow_up_at: z.coerce.date().optional(),
})

export const prospectUpdateSchema = prospectCreateSchema.partial()

export const prospectStatusUpdateSchema = z.object({
  status: prospectStatusSchema,
})

export const messageCreateSchema = z.object({
  prospect_id: z.string().uuid(),
  message_type: messageTypeSchema,
  content: z.string().trim().min(1).max(5000),
  subject: optionalTrimmedString(200),
})

export const tagCreateSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().trim().max(30).default("gray"),
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

export const generateMessageSchema = z.object({
  prospectId: z.string().uuid(),
  messageType: messageTypeSchema,
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
export type TagCreateInput = z.infer<typeof tagCreateSchema>
export const orgUpdateSchema = agencyProfileUpdateSchema

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type ThemeUpdateInput = z.infer<typeof themeUpdateSchema>
export type AgencyProfileUpdateInput = z.infer<typeof agencyProfileUpdateSchema>
export type OrgUpdateInput = z.infer<typeof orgUpdateSchema>
export type GenerateMessageInput = z.infer<typeof generateMessageSchema>
export type InviteCreateInput = z.infer<typeof inviteCreateSchema>
export type MemberRoleUpdateInput = z.infer<typeof memberRoleUpdateSchema>
