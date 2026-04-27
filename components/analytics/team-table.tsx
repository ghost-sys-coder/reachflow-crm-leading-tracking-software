import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalyticsData } from "@/app/actions/analytics"

export function TeamTable({ data }: { data: AnalyticsData }) {
  const stats = data.teamStats

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team performance</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No team members found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2.5 text-left text-xs font-medium text-muted-foreground">Member</th>
                  <th className="pb-2.5 text-right text-xs font-medium text-muted-foreground">Assigned</th>
                  <th className="pb-2.5 text-right text-xs font-medium text-muted-foreground">Booked</th>
                  <th className="pb-2.5 text-right text-xs font-medium text-muted-foreground">Booking rate</th>
                  <th className="w-32 pb-2.5 pl-4 text-left text-xs font-medium text-muted-foreground">Progress</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((m) => {
                  const ratePct = Math.round(m.bookingRate * 100)
                  return (
                    <tr key={m.userId} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{m.assigned}</td>
                      <td className="py-2.5 text-right tabular-nums">{m.booked}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {m.assigned === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          `${ratePct}%`
                        )}
                      </td>
                      <td className="py-2.5 pl-4">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{ width: `${ratePct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
