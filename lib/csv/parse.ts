export type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

export function parseCsv(raw: string): ParsedCsv {
  const lines = tokenize(raw)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].map((h) => h.trim())
  const rows = lines.slice(1).filter((r) => r.some((c) => c.trim() !== ""))
  return { headers, rows }
}

function tokenize(raw: string): string[][] {
  const result: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0

  while (i < raw.length) {
    const ch = raw[i]

    if (inQuotes) {
      if (ch === '"' && raw[i + 1] === '"') {
        field += '"'
        i += 2
        continue
      }
      if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field)
        field = ""
      } else if (ch === '\r' && raw[i + 1] === '\n') {
        row.push(field)
        field = ""
        result.push(row)
        row = []
        i += 2
        continue
      } else if (ch === '\n') {
        row.push(field)
        field = ""
        result.push(row)
        row = []
      } else {
        field += ch
      }
    }
    i++
  }

  row.push(field)
  if (row.some((c) => c !== "")) result.push(row)

  return result
}
