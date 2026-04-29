import { createAdminClient } from "@/lib/supabase/admin"
import type { ActivityAction } from "@/db/schema"

export async function logActivity(params: {
  orgId: string
  prospectId: string
  userId: string
  action: ActivityAction
  oldValue?: string | null
  newValue?: string | null
}): Promise<void> {
  try {
    const admin = createAdminClient()

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", params.userId)
      .single()

    const actorName = profile?.full_name ?? "Team member"

    await admin.from("activity_log").insert({
      org_id: params.orgId,
      prospect_id: params.prospectId,
      user_id: params.userId,
      actor_name: actorName,
      action: params.action,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
    })
  } catch {
    // never break the parent action
  }
}
