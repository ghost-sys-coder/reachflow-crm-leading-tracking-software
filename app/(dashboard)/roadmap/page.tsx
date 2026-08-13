import { notFound } from "next/navigation"

import { getRoadmapProgress } from "@/app/actions/roadmap"
import { RoadmapPage } from "@/components/roadmap/roadmap-page"
import { getAuthedClient } from "@/lib/auth/session"
import { isRoadmapAuthorizedUser } from "@/lib/roadmap/access"

export default async function ProductRoadmapPage() {
  const { user } = await getAuthedClient()
  if (!isRoadmapAuthorizedUser(user)) notFound()

  const progress = await getRoadmapProgress()
  if (progress.error) throw new Error(progress.error)

  return <RoadmapPage initialProgress={progress.data ?? []} />
}
