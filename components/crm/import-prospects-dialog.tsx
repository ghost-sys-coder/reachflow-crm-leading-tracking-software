"use client"

import * as React from "react"
import { CheckCircle2, FileUp, Upload, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { importProspects, type CsvImportRow, type ImportResult } from "@/app/actions/prospects"
import { parseCsv } from "@/lib/csv/parse"
import { Input } from "../ui/input"

const SKIP = "__skip__"

const IMPORT_FIELDS = [
  { key: "business_name", label: "Business name", required: true },
  { key: "platform",      label: "Platform",       required: true,  hint: "instagram · email · facebook · linkedin · twitter · other" },
  { key: "handle",        label: "Handle",          required: false },
  { key: "industry",      label: "Industry",        required: false },
  { key: "location",      label: "Location",        required: false },
  { key: "website_url",   label: "Website URL",     required: false },
  { key: "status",        label: "Status",          required: false, hint: "sent · waiting · replied · booked · closed · dead" },
  { key: "notes",         label: "Notes",           required: false },
] as const

type FieldKey = (typeof IMPORT_FIELDS)[number]["key"]
type FieldMapping = Partial<Record<FieldKey, string>>

type ParsedFile = {
  name: string
  headers: string[]
  previewRows: string[][]
  allRows: string[][]
}

type Step = "idle" | "mapping" | "importing" | "done"

const CSV_TEMPLATE = [
  "business_name,platform,handle,industry,location,website_url,status,notes",
  "Acme Corp,instagram,@acmecorp,Marketing,New York,https://acme.com,sent,Found via referral",
  "Beta Studio,linkedin,betastudio,Design,San Francisco,,waiting,",
].join("\r\n")

const TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/[\s\-]+/g, "_")
}

function autoMap(headers: string[]): FieldMapping {
  const result: FieldMapping = {}
  for (const field of IMPORT_FIELDS) {
    const match = headers.find((h) => normalizeKey(h) === field.key)
    if (match) result[field.key] = match
  }
  return result
}

function applyMapping(row: string[], headers: string[], mapping: FieldMapping, field: FieldKey): string {
  const header = mapping[field]
  if (!header) return ""
  const idx = headers.indexOf(header)
  return idx >= 0 ? (row[idx]?.trim() ?? "") : ""
}

export function ImportProspectsDialog() {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<Step>("idle")
  const [parsed, setParsed] = React.useState<ParsedFile | null>(null)
  const [mapping, setMapping] = React.useState<FieldMapping>({})
  const [result, setResult] = React.useState<ImportResult | null>(null)
  const [importError, setImportError] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function reset() {
    setStep("idle")
    setParsed(null)
    setMapping({})
    setResult(null)
    setImportError(null)
  }

  function handleClose(v: boolean) {
    if (!v) reset()
    setOpen(v)
  }

  function processFile(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv" && file.type !== "application/vnd.ms-excel") {
      toast.error("Please upload a .csv file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5 MB")
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0 || rows.length === 0) {
        toast.error("CSV appears to be empty")
        return
      }
      setParsed({ name: file.name, headers, previewRows: rows.slice(0, 3), allRows: rows })
      setMapping(autoMap(headers))
      setStep("mapping")
    }
    reader.readAsText(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  async function handleImport() {
    if (!parsed) return
    setStep("importing")

    const rows: CsvImportRow[] = parsed.allRows.map((row) => ({
      business_name: applyMapping(row, parsed.headers, mapping, "business_name"),
      platform:      applyMapping(row, parsed.headers, mapping, "platform"),
      handle:        applyMapping(row, parsed.headers, mapping, "handle") || undefined,
      industry:      applyMapping(row, parsed.headers, mapping, "industry") || undefined,
      location:      applyMapping(row, parsed.headers, mapping, "location") || undefined,
      website_url:   applyMapping(row, parsed.headers, mapping, "website_url") || undefined,
      status:        applyMapping(row, parsed.headers, mapping, "status") || undefined,
      notes:         applyMapping(row, parsed.headers, mapping, "notes") || undefined,
    }))

    const res = await importProspects(rows)
    if (res.error) {
      setImportError(res.error)
    } else {
      setResult(res.data)
    }
    setStep("done")
  }

  const canImport = Boolean(mapping.business_name && mapping.platform)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="size-4" />
          Import CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        {step === "idle" && (
          <>
            <DialogHeader>
              <DialogTitle>Import prospects</DialogTitle>
              <DialogDescription>
                Upload a CSV file to add multiple prospects at once. Maximum 500 rows.
              </DialogDescription>
            </DialogHeader>

            <div
              className={`mt-2 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <FileUp className="size-8 text-muted-foreground" />
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Choose a CSV file
                </button>
                <p className="mt-0.5 text-xs text-muted-foreground">or drag and drop it here</p>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Not sure about the format?{" "}
              <a
                href={TEMPLATE_HREF}
                download="prospects-template.csv"
                className="text-primary hover:underline"
              >
                Download template
              </a>
            </p>

            <Input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleInputChange}
            />
          </>
        )}

        {step === "mapping" && parsed && (
          <>
            <DialogHeader>
              <DialogTitle>Map columns</DialogTitle>
              <DialogDescription>
                {parsed.allRows.length} rows detected in <span className="font-medium">{parsed.name}</span>.
                Match your CSV columns to the prospect fields.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[55vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-[1fr_1fr] gap-x-4 gap-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prospect field</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CSV column</p>

                {IMPORT_FIELDS.map((field) => (
                  <React.Fragment key={field.key}>
                    <div className="flex flex-col justify-center">
                      <span className="text-sm">
                        {field.label}
                        {field.required && <span className="ml-0.5 text-destructive">*</span>}
                      </span>
                      {"hint" in field && (
                        <span className="text-[11px] text-muted-foreground">{field.hint}</span>
                      )}
                    </div>
                    <Select
                      value={mapping[field.key] ?? SKIP}
                      onValueChange={(v) =>
                        setMapping((prev) => ({ ...prev, [field.key]: v === SKIP ? undefined : v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="— skip —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP}>— skip —</SelectItem>
                        {parsed.headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </React.Fragment>
                ))}
              </div>

              {parsed.previewRows.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview (first {parsed.previewRows.length} rows)
                  </p>
                  <div className="overflow-x-auto rounded-md border text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          {IMPORT_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                            <th key={f.key} className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                              {f.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.previewRows.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            {IMPORT_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                              <td key={f.key} className="max-w-30 truncate px-2 py-1.5">
                                {applyMapping(row, parsed.headers, mapping, f.key) || (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-2">
              <Button variant="ghost" size="sm" onClick={reset}>Back</Button>
              <Button size="sm" onClick={handleImport} disabled={!canImport}>
                Import {parsed.allRows.length} rows
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Importing prospects…</p>
          </div>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>Import complete</DialogTitle>
            </DialogHeader>

            {importError ? (
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{importError}</p>
              </div>
            ) : result && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-md border border-green-500/30 bg-green-500/5 p-4">
                  <CheckCircle2 className="size-5 shrink-0 text-green-600" />
                  <p className="text-sm">
                    <span className="font-semibold">{result.imported}</span>{" "}
                    {result.imported === 1 ? "prospect" : "prospects"} imported successfully.
                  </p>
                </div>

                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">
                      {result.errors.length} {result.errors.length === 1 ? "row" : "rows"} skipped:
                    </p>
                    <ul className="max-h-40 overflow-y-auto space-y-1">
                      {result.errors.map((e) => (
                        <li key={e.row} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Row {e.row}:</span> {e.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="mt-2">
              <Button variant="ghost" size="sm" onClick={reset}>Import another file</Button>
              <Button size="sm" onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
