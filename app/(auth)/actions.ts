"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getPostAuthRedirect } from "@/lib/auth/redirect"

async function getOrigin() {
  return (await headers()).get("origin") ?? ""
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = String(formData.get("next") ?? "").trim() || null

  if (!email || !password) {
    redirect(`/sign-in?error=${encodeURIComponent("Enter your email and password")}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`)
  }

  redirect(next ?? (await getPostAuthRedirect(supabase)))
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const next = String(formData.get("next") ?? "").trim() || null

  if (!email) {
    redirect(`/sign-in?error=${encodeURIComponent("Enter your email to receive a magic link")}`)
  }

  const supabase = await createClient()
  const origin = await getOrigin()
  const callbackUrl = next
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/auth/callback`

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl },
  })

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/sign-in?sent=${encodeURIComponent(email)}`)
}

export async function signInWithGoogle(formData?: FormData) {
  const supabase = await createClient()
  const origin = await getOrigin()
  const next = formData ? String(formData.get("next") ?? "").trim() || null : null
  const callbackUrl = next
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/auth/callback`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  })

  if (error || !data.url) {
    redirect(
      `/sign-in?error=${encodeURIComponent(error?.message ?? "Could not start Google sign-in")}`,
    )
  }

  redirect(data.url)
}

export async function signUpWithPassword(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const invite = String(formData.get("invite") ?? "").trim() || null

  if (!email || !password) {
    const base = invite ? `/sign-up?invite=${invite}` : "/sign-up"
    redirect(`${base}&error=${encodeURIComponent("Email and password are required")}`)
  }

  if (password.length < 8) {
    const base = invite ? `/sign-up?invite=${invite}` : "/sign-up"
    redirect(`${base}&error=${encodeURIComponent("Password must be at least 8 characters")}`)
  }

  const supabase = await createClient()
  const origin = await getOrigin()

  // When signing up via invite, wire the callback so that after email
  // confirmation the user lands on the invite acceptance page, not onboarding
  const callbackUrl = invite
    ? `${origin}/auth/callback?next=${encodeURIComponent(`/invite/${invite}`)}`
    : `${origin}/auth/callback`

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: name ? { full_name: name } : undefined,
    },
  })

  if (error) {
    const base = invite ? `/sign-up?invite=${invite}` : "/sign-up"
    redirect(`${base}&error=${encodeURIComponent(error.message)}`)
  }

  // Email confirmations disabled — session is live immediately.
  // Invited users go straight to the invite acceptance page; others follow
  // the normal post-auth redirect (onboarding or pipeline).
  if (signUpData.session) {
    redirect(invite ? `/invite/${invite}` : await getPostAuthRedirect(supabase))
  }

  // Email confirmation required — direct the user to sign in.
  // Include ?next so after confirming + signing in they land on the invite page.
  if (invite) {
    redirect(
      `/sign-in?next=${encodeURIComponent(`/invite/${invite}`)}&message=${encodeURIComponent("Check your email to confirm your account, then accept your invitation")}`,
    )
  }

  redirect(
    `/sign-in?message=${encodeURIComponent("Check your email to confirm your account")}`,
  )
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()

  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent("Enter your email")}`)
  }

  const supabase = await createClient()
  const origin = await getOrigin()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/settings`,
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/forgot-password?sent=${encodeURIComponent(email)}`)
}
