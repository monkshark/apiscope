export interface HarHeader {
  name: string
  value: string
}

export function headersToRecord(headers: HarHeader[] | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!headers) return out
  for (const h of headers) {
    if (!h || typeof h.name !== 'string') continue
    if (h.name.startsWith(':')) continue
    out[h.name] = h.name in out ? `${out[h.name]}, ${h.value}` : h.value
  }
  return out
}

export function getHeader(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key]
  }
  return undefined
}

export function headersToLines(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

export function parseHeaderLines(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const idx = trimmed.indexOf(':')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (key) out[key] = value
  }
  return out
}
