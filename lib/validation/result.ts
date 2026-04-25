import type { ZodError } from "zod"

import type { ActionResult } from "@/types/database"

export function ok<T>(data: T): ActionResult<T> {
  return { data, error: null }
}

export function fail<T>(error: string): ActionResult<T> {
  return { data: null, error }
}

//format a Zod error to a single human-readable line
export function zodErrorMessage(error: ZodError): string {
  const first = error.issues[0]
  if (!first) return "Invalid input"
  const path = first.path.join(".")
  return path ? `${path}: ${first.message}` : first.message
}
