import "server-only"

import type { Message, Prospect } from "@/types/database"

export type AgencyProfile = {
  agency_name: string
  sender_name: string | null
  agency_services: string[] | null
  agency_website: string | null
  agency_value_props: string | null
}

export type PromptTarget = {
  system: string
  user: string
}

function agencyBlock(agency: AgencyProfile): string {
  const lines: string[] = [`Agency name: ${agency.agency_name}`]
  if (agency.sender_name) lines.push(`Sender: ${agency.sender_name}`)
  if (agency.agency_services?.length)
    lines.push(`Services: ${agency.agency_services.join(", ")}`)
  if (agency.agency_website) lines.push(`Website: ${agency.agency_website}`)
  if (agency.agency_value_props)
    lines.push(`What the agency does best: ${agency.agency_value_props}`)
  return lines.join("\n")
}

function prospectBlock(prospect: Prospect): string {
  const lines: string[] = [
    `Business name: ${prospect.business_name}`,
    `Platform: ${prospect.platform}`,
  ]
  if (prospect.industry) lines.push(`Industry: ${prospect.industry}`)
  if (prospect.location) lines.push(`Location: ${prospect.location}`)
  if (prospect.handle) lines.push(`Handle/contact: ${prospect.handle}`)
  if (prospect.website_url) lines.push(`Website: ${prospect.website_url}`)
  if (prospect.notes) lines.push(`Notes from my research: ${prospect.notes}`)
  return lines.join("\n")
}

const BASE_RULES = `You write outreach messages as a real human, not an AI.

Hard rules:
- Return plain text only. No markdown, no asterisks, no brackets, no code blocks.
- Do not invent facts. Only use details provided below.
- No em-dashes.
- Skip corporate filler ("I hope this finds you well", "leverage", "synergize", "circle back").
- Never use placeholders like [Name] or {{business}}. Use what is given, or omit gracefully.`

export function buildInstagramDmPrompt(
  agency: AgencyProfile,
  prospect: Prospect,
  extraContext?: string,
): PromptTarget {
  const system = `${BASE_RULES}

You are writing a first-touch Instagram DM on behalf of the agency below.

Constraints for this message type:
- Max 100 words. Treat this as a hard cap.
- Conversational and direct. Write like a human typing a DM.
- No subject line. DMs do not have one.
- Lead with a prospect-specific observation drawn from the research notes when possible.
- Close with one low-friction question, never a meeting ask on first touch.
- Do not include the prospect's handle, an opening greeting like "Hi [Name]", or a signature. Open straight into the observation.`

  const user = `Agency context:
${agencyBlock(agency)}

Prospect:
${prospectBlock(prospect)}${extraContext ? `\n\nAdditional context from the sender:\n${extraContext}` : ""}

Write the Instagram DM now. Return plain text only.`

  return { system, user }
}

export function buildColdEmailPrompt(
  agency: AgencyProfile,
  prospect: Prospect,
  extraContext?: string,
): PromptTarget {
  const system = `${BASE_RULES}

You are writing a first-touch cold email on behalf of the agency below.

Output format, strictly:
---SUBJECT---
<subject line here>
---BODY---
<email body here>

Constraints:
- Subject under 8 words, benefit-led, no clickbait or all-caps.
- Body: 120 to 150 words.
- Formal but not corporate. Write like a competent human, not a template.
- Start with a prospect-specific hook from the research notes when possible.
- One clear single CTA near the end.
- Sign off with the sender's name when provided; no signature block.`

  const user = `Agency context:
${agencyBlock(agency)}

Prospect:
${prospectBlock(prospect)}${extraContext ? `\n\nAdditional context from the sender:\n${extraContext}` : ""}

Write the cold email now. Use the exact ---SUBJECT--- and ---BODY--- delimiters.`

  return { system, user }
}

export function buildFollowUpPrompt(
  agency: AgencyProfile,
  prospect: Prospect,
  previousMessage: Message,
  daysSince: number,
): PromptTarget {
  const hadSubject = Boolean(previousMessage.subject)
  const system = `${BASE_RULES}

You are writing a follow-up to a message the sender already sent.

Constraints:
- Under 60 words. Hard cap.
- Reference the previous message naturally. Do not quote it in full.
- Acknowledge it has been a few days without being defensive or apologetic.
- Add something new: a specific angle, a proof point, or a sharper question. Do not just bump.
- Close with a soft CTA that makes replying easy.
${
  hadSubject
    ? `- The previous message had a subject. Return a new short subject too, using the ---SUBJECT--- / ---BODY--- format.`
    : `- Return body text only. No delimiters.`
}`

  const user = `Agency context:
${agencyBlock(agency)}

Prospect:
${prospectBlock(prospect)}

Previous message sent ${daysSince} day${daysSince === 1 ? "" : "s"} ago:
${previousMessage.subject ? `Subject: ${previousMessage.subject}\n\n` : ""}${previousMessage.content}

Write the follow-up now.`

  return { system, user }
}

export function buildCustomPrompt(
  agency: AgencyProfile,
  prospect: Prospect,
  userInstructions: string,
): PromptTarget {
  const system = `${BASE_RULES}

You are writing an outreach message following the sender's custom instructions. Respect their stated tone, length, and structure. If they ask for a subject line, use the ---SUBJECT--- / ---BODY--- format. Otherwise return body text only.`

  const user = `Agency context:
${agencyBlock(agency)}

Prospect:
${prospectBlock(prospect)}

Sender instructions for this message:
${userInstructions}

Write the message now.`

  return { system, user }
}

//extracts a ---SUBJECT--- / ---BODY--- pair if the model emitted one,
//otherwise returns the text as-is
export function parseSubjectBody(text: string): { subject?: string; content: string } {
  const subjectMatch = text.match(/---SUBJECT---\s*([\s\S]*?)\s*---BODY---/)
  const bodyMatch = text.match(/---BODY---\s*([\s\S]*)/)
  if (subjectMatch && bodyMatch) {
    return {
      subject: subjectMatch[1].trim(),
      content: bodyMatch[1].trim(),
    }
  }
  return { content: text.trim() }
}
