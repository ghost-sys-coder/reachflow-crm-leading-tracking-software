import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { BrandMark } from "@/components/shared/brand-mark"
import { createClient } from "@/lib/supabase/server"

export async function LandingNavV2() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-40 border-b border-[#e4e4df] bg-[#fbfbf8]/90 text-[#171715] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <Link href="/v2" aria-label="ReachFlow home"><BrandMark size="md" /></Link>
        <nav className="hidden items-center gap-8 text-xs text-[#686862] md:flex" aria-label="Primary navigation">
          <Link href="#features" className="transition hover:text-[#171715]">Product</Link>
          <Link href="#results" className="transition hover:text-[#171715]">Results</Link>
          <Link href="#pricing" className="transition hover:text-[#171715]">Pricing</Link>
        </nav>
        <Link href={user ? "/pipeline" : "/sign-up"} className="inline-flex h-9 items-center gap-2 bg-[#171715] px-4 text-xs font-medium text-white transition hover:bg-[#356df3]">
          {user ? "Dashboard" : "Get started"}<ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </header>
  )
}
