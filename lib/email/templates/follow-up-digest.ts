type DigestProspect = {
  id: string
  business_name: string
  platform: string
  status: string
  handle: string | null
  follow_up_at: string | Date | null
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function daysOverdue(date: string | Date | null): string {
  if (!date) return ""
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (diff < 0)  return "Due today"
  if (diff === 0) return "Due today"
  if (diff === 1) return "1 day overdue"
  return `${diff} days overdue`
}

const STATUS_COLORS: Record<string, string> = {
  sent:    "#3b82f6",
  waiting: "#f59e0b",
  replied: "#10b981",
  booked:  "#16a34a",
  closed:  "#94a3b8",
  dead:    "#f87171",
}

function prospectRow(p: DigestProspect, appUrl: string): string {
  const overdue   = daysOverdue(p.follow_up_at)
  const color     = STATUS_COLORS[p.status] ?? "#6b7280"
  const url       = `${appUrl}/prospects/${esc(p.id)}`
  const subtitle  = p.handle ? esc(p.handle) : esc(p.platform)
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <a href="${url}" style="font-size:15px;font-weight:600;color:#111827;text-decoration:none;">
                ${esc(p.business_name)}
              </a>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${subtitle}</p>
            </td>
            <td style="text-align:right;white-space:nowrap;padding-left:16px;">
              <span style="display:inline-block;padding:3px 8px;border-radius:999px;background:${color}20;color:${color};font-size:12px;font-weight:600;text-transform:capitalize;">
                ${esc(p.status)}
              </span>
              <p style="margin:3px 0 0;font-size:11px;color:#9ca3af;text-align:right;">${overdue}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

export function digestEmailHtml({
  userName,
  prospects,
  appUrl,
}: {
  userName: string
  prospects: DigestProspect[]
  appUrl: string
}) {
  const count  = prospects.length
  const rows   = prospects.map((p) => prospectRow(p, appUrl)).join("")
  const settingsUrl = `${appUrl}/settings`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Follow-up reminder</title>
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
            <td style="padding:36px 40px 8px;">
              <h1 style="margin:0 0 6px;font-size:21px;font-weight:700;color:#111827;line-height:1.3;">
                You have ${count} prospect${count !== 1 ? "s" : ""} due for follow-up
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                Hi ${esc(userName)}, here's today's digest. Don't let these slip through.
              </p>

              <table cellpadding="0" cellspacing="0" width="100%">
                ${rows}
              </table>

              <table cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td style="border-radius:8px;background:#4f46e5;">
                    <a href="${appUrl}/prospects"
                       style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Open ReachFlow
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                You're receiving this because follow-up reminders are enabled for your account.<br />
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
