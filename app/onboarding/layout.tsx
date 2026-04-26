import Link from "next/link"
import { AuthBrandPanel } from "@/components/shared/auth-brand-panel"
import { BrandMark } from "@/components/shared/brand-mark"
import { ThemeSwitcher } from "@/components/shared/theme-switcher"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="ReachFlow home">
            <BrandMark size="md" />
          </Link>
          <ThemeSwitcher />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md animate-fade-in">{children}</div>
        </div>

        <footer className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} ReachFlow
        </footer>
      </section>

      <AuthBrandPanel />
    </div>
  )
}
