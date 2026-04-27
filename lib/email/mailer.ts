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

export async function sendMail(options: {
  to: string
  subject: string
  html: string
}) {
  const transporter = createTransporter()
  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
}
