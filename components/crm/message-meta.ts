import {
  Mail,
  MessageCircle,
  RefreshCcw,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import type { MessageType } from "@/db/schema"

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  instagram_dm: "Instagram DM",
  cold_email: "Cold email",
  follow_up: "Follow-up",
  custom: "Custom",
}

export const MESSAGE_TYPE_ICONS: Record<MessageType, LucideIcon> = {
  instagram_dm: MessageCircle,
  cold_email: Mail,
  follow_up: RefreshCcw,
  custom: Sparkles,
}
