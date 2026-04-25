import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const DASHBOARD_PREFIXES = ["/pipeline", "/prospects", "/settings", "/design-system"]
const AUTH_PATHS = new Set(["/sign-in", "/sign-up", "/forgot-password"])

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isDashboardRoute = DASHBOARD_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
  const isAuthRoute = AUTH_PATHS.has(path)

  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/pipeline"
    return NextResponse.redirect(url)
  }

  return response
}
