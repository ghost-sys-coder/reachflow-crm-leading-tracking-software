import Link from "next/link"
import { BrandMark } from "@/components/shared/brand-mark"

export function LandingFooterV2() {
  return (
    <footer className="bg-[#171715] text-white">
      <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8">
        <div className="flex flex-col justify-between gap-10 border-b border-white/15 pb-12 sm:flex-row">
          <div><BrandMark size="md" /><p className="mt-4 max-w-sm text-sm leading-6 text-white/55">The outreach CRM for agencies that want a clean process and more human conversations.</p></div>
          <nav className="flex flex-wrap gap-x-8 gap-y-4 text-sm text-white/60"><Link href="#features">Product</Link><Link href="#pricing">Pricing</Link><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Start free</Link></nav>
        </div>
        <div className="flex flex-col justify-between gap-3 pt-6 text-[11px] text-white/40 sm:flex-row"><p>© {new Date().getFullYear()} ReachFlow</p><div className="flex flex-wrap gap-5"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/data-deletion">Data deletion</Link></div></div>
      </div>
    </footer>
  )
}
