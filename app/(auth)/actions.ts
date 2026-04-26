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

  if (!email || !password) {
    redirect(`/sign-up?error=${encodeURIComponent("Email and password are required")}`)
  }

  if (password.length < 8) {
    redirect(`/sign-up?error=${encodeURIComponent("Password must be at least 8 characters")}`)
  }

  const supabase = await createClient()
  const origin = await getOrigin()

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: name ? { full_name: name } : undefined,
    },
  })

  if (error) {
    redirect(`/sign-up?error=${encodeURIComponent(error.message)}`)
  }

  // When email confirmations are disabled, Supabase auto-confirms and returns
  // a session immediately. Skip the "check your email" screen in that case.
  if (signUpData.session) {
    redirect(await getPostAuthRedirect(supabase))
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
