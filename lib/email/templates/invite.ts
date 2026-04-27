export function inviteEmailHtml({
  inviterName,
  orgName,
  inviteUrl,
  expiresInDays = 7,
}: {
  inviterName: string
  orgName: string
  inviteUrl: string
  expiresInDays?: number
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to ${orgName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:32px 40px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">ReachFlow</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
                You've been invited to join ${escapeHtml(orgName)}
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                ${escapeHtml(inviterName)} has invited you to collaborate on
                <strong style="color:#111827;">${escapeHtml(orgName)}</strong> on ReachFlow.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#4f46e5;">
                    <a href="${escapeHtml(inviteUrl)}"
                       style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
                Or copy this link into your browser:<br />
                <a href="${escapeHtml(inviteUrl)}" style="color:#4f46e5;word-break:break-all;">${escapeHtml(inviteUrl)}</a>
              </p>

              <hr style="margin:28px 0;border:none;border-top:1px solid #f3f4f6;" />

              <p style="margin:0;font-size:13px;color:#9ca3af;">
                This invite expires in ${expiresInDays} days. If you didn't expect this email you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent by ReachFlow &mdash; outreach automation for agencies.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
