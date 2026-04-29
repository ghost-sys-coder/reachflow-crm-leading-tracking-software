function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function prospectAssignedEmailHtml({
  recipientName,
  actorName,
  businessName,
  platform,
  handle,
  prospectUrl,
  settingsUrl,
}: {
  recipientName: string
  actorName: string
  businessName: string
  platform: string
  handle: string | null
  prospectUrl: string
  settingsUrl: string
}) {
  const subtitle = handle ? esc(handle) : esc(platform)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New lead assigned</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:#4f46e5;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">ReachFlow</p>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 40px 32px;">
              <h1 style="margin:0 0 6px;font-size:21px;font-weight:700;color:#111827;line-height:1.3;">
                You've been assigned a new lead
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                Hi ${esc(recipientName)}, ${esc(actorName)} assigned the following prospect to you.
              </p>

              <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#111827;">${esc(businessName)}</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;">${subtitle}</p>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="border-radius:8px;background:#4f46e5;">
                    <a href="${prospectUrl}"
                       style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      View prospect
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                You're receiving this because a lead was assigned to you in ReachFlow.<br />
                <a href="${settingsUrl}" style="color:#6b7280;">Manage notification preferences</a>
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
