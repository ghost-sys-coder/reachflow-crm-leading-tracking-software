import type { NextRequest } from "next/server"

import { GET as handleGmailCallback } from "@/app/api/integrations/gmail/callback/route"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  return handleGmailCallback(request)
}
