import { createHmac } from "node:crypto"
import process from "node:process"
import { config } from "dotenv"

config({ path: ".env.local" })
config({ path: ".env" })

const configured = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()
const appId = (process.env.META_APP_ID || process.env.APP_ID || process.env.WHATSAPP_APP_ID)?.trim()
const appSecret = (process.env.META_APP_SECRET || process.env.APP_SECRET || process.env.WHATSAPP_APP_SECRET)?.trim()

if (configured) {
  process.stdout.write(`${configured}\n`)
} else if (appId && appSecret) {
  process.stdout.write(`${createHmac("sha256", appSecret).update(`reachflow:whatsapp:webhook:${appId}`).digest("hex")}\n`)
} else {
  throw new Error("Configure WHATSAPP_WEBHOOK_VERIFY_TOKEN or both META_APP_ID and META_APP_SECRET")
}
