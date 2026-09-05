import { z } from "zod"

import { getAuthedOrgClient } from "@/lib/auth/org"

export const runtime = "nodejs"

const diagnosticSchema = z.object({
  phase: z.enum(["sdk_initialized", "sdk_error", "login_started", "login_callback", "session_event", "callback_started", "callback_finished", "failed"]),
  attemptId: z.string().uuid(),
  detail: z.string().trim().max(300).optional(),
})

export async function POST(request: Request) {
  const { ctx } = await getAuthedOrgClient()
  if (!ctx) return new Response(null, { status: 401 })

  const parsed = diagnosticSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response(null, { status: 400 })

  console.info("[whatsapp:embedded-signup]", {
    phase: parsed.data.phase,
    attemptId: parsed.data.attemptId,
    detail: parsed.data.detail,
    orgId: ctx.orgId,
  })
  return new Response(null, { status: 204 })
}
