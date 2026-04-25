import type {
  messages,
  profiles,
  prospectTags,
  prospects,
  tags,
} from "@/db/schema"

//base row types inferred from Drizzle schema
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert

export type Prospect = typeof prospects.$inferSelect
export type NewProspect = typeof prospects.$inferInsert

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert

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

//consistent return shape for every server action
export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export type ProspectFilters = {
  status?: Prospect["status"]
  platform?: Prospect["platform"]
  search?: string
}
