export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"
export const GOOGLE_IDENTITY_SCOPES = ["openid", "email", GMAIL_SEND_SCOPE]

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI must be configured")
  }
  return { clientId, clientSecret, redirectUri }
}
