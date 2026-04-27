import { Palette, Shield, Sparkles, Tag, User, Users } from "lucide-react"

import { AgencyForm } from "@/components/settings/agency-form"
import { AppearanceSection } from "@/components/settings/appearance-section"
import { ProfileForm } from "@/components/settings/profile-form"
import { TagsSection } from "@/components/settings/tags-section"
import { TeamSection } from "@/components/settings/team-section"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCurrentOrg, getCurrentProfile } from "@/app/actions/profile"
import { getUserTags } from "@/app/actions/tags"
import { getTeamMembers, getPendingInvites } from "@/app/actions/team"
import { getAuthedOrgClient } from "@/lib/auth/org"
import type { Theme } from "@/components/shared/theme-provider"
import type { MemberRole } from "@/types/database"

const ROLE_META: Record<
  MemberRole,
  { label: string; description: string; color: string }
> = {
  admin: {
    label: "Admin",
    description:
      "Full workspace access. You can invite and remove team members, assign leads, manage agency settings, and configure all workspace preferences.",
    color: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  },
  editor: {
    label: "Editor",
    description:
      "Contributor access. You can add and edit prospects, generate outreach messages, update pipeline statuses, and manage tags — but cannot change workspace settings or manage the team.",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  viewer: {
    label: "Viewer",
    description:
      "Read-only access. You can browse all prospects and message history, but cannot make edits or changes to the workspace.",
    color: "bg-muted text-muted-foreground border-border",
  },
}

function RoleBadge({ role }: { role: MemberRole }) {
  const meta = ROLE_META[role]
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <Shield className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Your role
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}
        >
          {meta.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {meta.description}
      </p>
    </div>
  )
}

const NAV_ITEMS = [
  { value: "profile", label: "Profile", icon: User },
  { value: "agency", label: "Agency", icon: Sparkles },
  { value: "appearance", label: "Appearance", icon: Palette },
  { value: "tags", label: "Tags", icon: Tag },
  { value: "team", label: "Team", icon: Users },
] as const

export default async function SettingsPage() {
  const [profileResult, orgResult, tagsResult, membersResult, invitesResult, orgCtx] =
    await Promise.all([
      getCurrentProfile(),
      getCurrentOrg(),
      getUserTags(),
      getTeamMembers(),
      getPendingInvites(),
      getAuthedOrgClient(),
    ])

  const profile = profileResult.data ?? null
  const org = orgResult.data ?? null
  const tags = tagsResult.data ?? []
  const members = membersResult.data ?? []
  const invites = invitesResult.data ?? []
  const savedTheme = (profile?.theme_preference ?? "default") as Theme
  const currentUserId = orgCtx.ctx?.userId ?? ""
  const currentUserRole = (orgCtx.ctx?.role ?? "viewer") as MemberRole

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile, workspace appearance, and prospect tags.
        </p>
      </div>

      <Tabs
        defaultValue="profile"
        orientation="vertical"
        className="flex-col gap-5 md:flex-row md:items-start md:gap-8"
      >
        {/* Sidebar nav */}
        <aside className="w-full md:w-52 md:shrink-0">
          <div className="md:overflow-hidden md:rounded-xl md:border md:border-border md:bg-card md:ring-1 md:ring-foreground/10">
            <div className="hidden md:block md:border-b md:border-border md:px-4 md:py-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Workspace
              </p>
            </div>

            <TabsList className="flex h-auto w-full items-stretch gap-1 overflow-x-auto rounded-lg bg-muted p-1 shadow-none md:flex-col md:gap-0 md:overflow-visible md:rounded-none md:bg-transparent md:p-2">
              {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="group/nav-item flex-1 shrink-0 justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground md:flex-initial md:justify-start md:gap-3 md:rounded-lg md:px-3 md:py-2.5 md:hover:bg-muted md:data-[state=active]:bg-muted"
                >
                  {/* Mobile: small inline icon */}
                  <Icon className="size-4 shrink-0 md:hidden" />

                  {/* Desktop: icon-box that highlights when active */}
                  <span className="hidden size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background shadow-xs transition-colors md:inline-flex md:group-data-[state=active]/nav-item:border-primary/30 md:group-data-[state=active]/nav-item:bg-primary/5 md:group-data-[state=active]/nav-item:text-primary">
                    <Icon className="size-3.5" />
                  </span>

                  <span className="truncate">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </aside>

        {/* Content area */}
        <div className="min-w-0 flex-1 space-y-0">
          <TabsContent value="profile">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Your name and agency details shown across the workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-6">
                <RoleBadge role={currentUserRole} />
                <ProfileForm profile={profile} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agency">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Agency profile</CardTitle>
                <CardDescription>
                  Injected into every AI-generated outreach message. Fill this in before generating.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <AgencyForm org={org} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customise how ReachFlow looks for you.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <AppearanceSection savedTheme={savedTheme} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Create and manage tags for organising your prospects.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <TagsSection initialTags={tags} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Team</CardTitle>
                <CardDescription>
                  Invite teammates and manage their access to this workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <TeamSection
                  initialMembers={members}
                  initialInvites={invites}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
