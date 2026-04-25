import "server-only"

import { GoogleGenerativeAI } from "@google/generative-ai"

export const DEFAULT_MODEL = "gemini-2.5-flash"

let singleton: GoogleGenerativeAI | null = null

export function getGeminiClient(): GoogleGenerativeAI {
  if (singleton) return singleton

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set")
  }

  singleton = new GoogleGenerativeAI(apiKey)
  return singleton
}
