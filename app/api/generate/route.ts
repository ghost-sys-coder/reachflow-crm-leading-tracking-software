import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"

import { DEFAULT_MODEL, getGeminiClient } from "@/lib/gemini/client"
import {
  buildColdEmailPrompt,
  buildCustomPrompt,
  buildFollowUpPrompt,
  buildInstagramDmPrompt,
  parseSubjectBody,
  type AgencyProfile,
  type PromptTarget,
} from "@/lib/gemini/prompts"
import { getAuthedOrgClient } from "@/lib/auth/org"
import { generateMessageSchema } from "@/lib/validation/schemas"
import type { Message, Prospect } from "@/types/database"

const DAILY_GENERATION_LIMIT = 50

function agencyProfileComplete(org: {
  agency_name?: string | null
} | null): org is {
  agency_name: string
  sender_name: string | null
  agency_services: string[] | null
  agency_website: string | null
  agency_value_props: string | null
} {
  return Boolean(org?.agency_name)
}

export async function POST(request: NextRequest) {
  const json = (await request.json().catch(() => null)) as unknown
  const parsed = generateMessageSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { ctx, error: orgError } = await getAuthedOrgClient()
  if (!ctx) {
    return NextResponse.json({ error: orgError }, { status: 401 })
  }

  const { supabase, userId, orgId } = ctx
  const { prospectId, messageType, customInstructions } = parsed.data

  const [prospectResult, orgResult, usageResult] = await Promise.all([
    supabase.from("prospects").select("*").eq("id", prospectId).maybeSingle(),
    supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
    supabase
      .from("generation_logs")
      .select("id", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ),
  ])

  if (prospectResult.error) {
    return NextResponse.json({ error: prospectResult.error.message }, { status: 500 })
  }
  if (!prospectResult.data) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
  }

  const org = orgResult.data
  if (!agencyProfileComplete(org)) {
    return NextResponse.json(
      { error: "Set up your agency profile first", code: "agency_incomplete" },
      { status: 400 },
    )
  }

  if ((usageResult.count ?? 0) >= DAILY_GENERATION_LIMIT) {
    return NextResponse.json(
      {
        error: `Daily generation limit of ${DAILY_GENERATION_LIMIT} reached. Try again tomorrow.`,
        code: "rate_limited",
      },
      { status: 429, headers: { "Retry-After": "86400" } },
    )
  }

  const prospect = prospectResult.data as Prospect
  const agency: AgencyProfile = {
    agency_name: org.agency_name,
    sender_name: org.sender_name,
    agency_services: org.agency_services,
    agency_website: org.agency_website,
    agency_value_props: org.agency_value_props,
  }

  let prompt: PromptTarget
  switch (messageType) {
    case "instagram_dm":
      prompt = buildInstagramDmPrompt(agency, prospect, customInstructions)
      break
    case "cold_email":
      prompt = buildColdEmailPrompt(agency, prospect, customInstructions)
      break
    case "follow_up": {
      const { data: priors } = await supabase
        .from("messages")
        .select("*")
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false })
        .limit(1)
      const previous = priors?.[0] as Message | undefined
      if (!previous) {
        return NextResponse.json(
          { error: "Generate a first message before following up." },
          { status: 400 },
        )
      }
      const daysSince = Math.max(
        1,
        Math.round(
          (Date.now() - new Date(previous.created_at).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      )
      prompt = buildFollowUpPrompt(agency, prospect, previous, daysSince)
      break
    }
    case "custom": {
      const instructions = customInstructions?.trim()
      if (!instructions) {
        return NextResponse.json(
          { error: "Custom messages require instructions." },
          { status: 400 },
        )
      }
      prompt = buildCustomPrompt(agency, prospect, instructions)
      break
    }
  }

  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    systemInstruction: prompt.system,
  })

  let rawText: string
  let inputTokens = 0
  let outputTokens = 0

  try {
    const result = await model.generateContent(prompt.user)
    rawText = result.response.text().trim()
    const usageMeta = result.response.usageMetadata
    inputTokens = usageMeta?.promptTokenCount ?? 0
    outputTokens = usageMeta?.candidatesTokenCount ?? 0
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      return NextResponse.json(
        { error: "Gemini rate-limited the request. Try again in a moment." },
        { status: 429, headers: { "Retry-After": "30" } },
      )
    }
    if (msg.includes("401") || msg.toLowerCase().includes("api key")) {
      return NextResponse.json(
        { error: "AI service credentials are not configured." },
        { status: 500 },
      )
    }
    return NextResponse.json({ error: "Generation failed." }, { status: 500 })
  }

  const { subject, content } = parseSubjectBody(rawText)
  if (!content) {
    return NextResponse.json(
      { error: "Empty response from AI. Try regenerating." },
      { status: 502 },
    )
  }

  const { data: saved, error: saveError } = await supabase
    .from("messages")
    .insert({
      prospect_id: prospectId,
      org_id: orgId,
      user_id: userId,
      message_type: messageType,
      content,
      subject: subject ?? null,
      was_sent: false,
    })
    .select()
    .single()

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 })
  }

  //best-effort logging; never block the response
  await supabase
    .from("generation_logs")
    .insert({
      org_id: orgId,
      prospect_id: prospectId,
      message_type: messageType,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    })

  revalidatePath(`/prospects/${prospectId}`)

  return NextResponse.json({
    message: saved,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    },
  })
}
