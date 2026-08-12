import {
  Mail,
  MessageCircle,
  RefreshCcw,
  Phone,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import type { MessageType } from "@/db/schema"

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  instagram_dm: "Instagram DM",
  cold_email: "Cold email",
  facebook_message: "Facebook message",
  linkedin_message: "LinkedIn message",
  x_message: "X message",
  call_note: "Call",
  follow_up: "Follow-up",
  custom: "Custom",
}

export const MESSAGE_TYPE_ICONS: Record<MessageType, LucideIcon> = {
  instagram_dm: MessageCircle,
  cold_email: Mail,
  facebook_message: MessageCircle,
  linkedin_message: MessageCircle,
  x_message: MessageCircle,
  call_note: Phone,
  follow_up: RefreshCcw,
  custom: Sparkles,
}
