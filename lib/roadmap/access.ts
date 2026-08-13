import type { User } from "@supabase/supabase-js"

export const ROADMAP_ALLOWED_EMAILS = [
  "franktamalejr@gmail.com",
  "juniorbeast177@gmail.com",
] as const

const ROADMAP_EMAIL_SET = new Set<string>(ROADMAP_ALLOWED_EMAILS)

export function isRoadmapAuthorizedEmail(email: string | null | undefined): boolean {
  return ROADMAP_EMAIL_SET.has(email?.trim().toLowerCase() ?? "")
}

export function isRoadmapAuthorizedUser(user: User | null): boolean {
  return Boolean(user && isRoadmapAuthorizedEmail(user.email))
}
