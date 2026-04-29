import type {
  messageTemplates,
  messages,
  notifications,
  organizationInvites,
  organizationMembers,
  organizations,
  profiles,
  prospectTags,
  prospects,
  tags,
} from "@/db/schema"

export type { NotificationType } from "@/db/schema"

//base row types inferred from Drizzle schema
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert

export type OrganizationMember = typeof organizationMembers.$inferSelect
export type NewOrganizationMember = typeof organizationMembers.$inferInsert

export type OrganizationInvite = typeof organizationInvites.$inferSelect
export type NewOrganizationInvite = typeof organizationInvites.$inferInsert

export type MemberRole = "admin" | "editor" | "viewer"

export type TeamMember = {
  id: string
  org_id: string
  user_id: string
  role: MemberRole
  invited_by: string | null
  created_at: string
  full_name: string | null
  email: string
}

export type Prospect = typeof prospects.$inferSelect
export type NewProspect = typeof prospects.$inferInsert

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert

export type MessageTemplate = typeof messageTemplates.$inferSelect
export type NewMessageTemplate = typeof messageTemplates.$inferInsert

export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert

export type ProspectTag = typeof prospectTags.$inferSelect
export type NewProspectTag = typeof prospectTags.$inferInsert

//joined shapes we return from server actions
export type ProspectWithTags = Prospect & {
  tags: Tag[]
}

export type ProspectWithDetail = Prospect & {
  tags: Tag[]
  messages: Message[]
}

export type MessageWithProspect = Message & {
  prospect: Prospect
}

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

//consistent return shape for every server action
export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export type ProspectFilters = {
  status?: Prospect["status"]
  platform?: Prospect["platform"]
  search?: string
}
