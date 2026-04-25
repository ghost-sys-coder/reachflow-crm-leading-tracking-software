import { Palette, Sparkles, Tag, User } from "lucide-react"

import { AgencyForm } from "@/components/settings/agency-form"
import { AppearanceSection } from "@/components/settings/appearance-section"
import { ProfileForm } from "@/components/settings/profile-form"
import { TagsSection } from "@/components/settings/tags-section"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCurrentProfile } from "@/app/actions/profile"
import { getUserTags } from "@/app/actions/tags"
import type { Theme } from "@/components/shared/theme-provider"

const NAV_ITEMS = [
  { value: "profile", label: "Profile", icon: User },
  { value: "agency", label: "Agency", icon: Sparkles },
  { value: "appearance", label: "Appearance", icon: Palette },
  { value: "tags", label: "Tags", icon: Tag },
] as const

export default async function SettingsPage() {
  const [profileResult, tagsResult] = await Promise.all([
    getCurrentProfile(),
    getUserTags(),
  ])

  const profile = profileResult.data ?? null
  const tags = tagsResult.data ?? []
  const savedTheme = (profile?.theme_preference ?? "default") as Theme

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
              <CardContent className="pt-5">
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
                <AgencyForm profile={profile} />
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
        </div>
      </Tabs>
    </div>
  )
}
