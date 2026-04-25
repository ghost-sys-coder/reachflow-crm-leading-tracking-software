"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

async function getOrigin() {
  return (await headers()).get("origin") ?? ""
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    redirect(`/sign-in?error=${encodeURIComponent("Enter your email and password")}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/pipeline")
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()

  if (!email) {
    redirect(`/sign-in?error=${encodeURIComponent("Enter your email to receive a magic link")}`)
  }

  const supabase = await createClient()
  const origin = await getOrigin()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/sign-in?sent=${encodeURIComponent(email)}`)
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = await getOrigin()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
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

  const { error } = await supabase.auth.signUp({
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
