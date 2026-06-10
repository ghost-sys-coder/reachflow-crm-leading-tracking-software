import nodemailer from "nodemailer"

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER and SMTP_PASS must be set to send emails")
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export const FROM_ADDRESS =
  process.env.SMTP_FROM ?? `"ReachFlow" <noreply@reachflow.app>`

function resolveFrom(fromName?: string): string {
  if (!fromName) return FROM_ADDRESS
  const emailMatch = FROM_ADDRESS.match(/<(.+?)>/)
  const email = emailMatch ? emailMatch[1] : FROM_ADDRESS.trim()
  return `"${fromName}" <${email}>`
}

export async function sendMail(options: {
  to: string
  subject: string
  html: string
  fromName?: string
}) {
  const transporter = createTransporter()
  await transporter.sendMail({
    from: resolveFrom(options.fromName),
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
}
