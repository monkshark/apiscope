export const FUZZ_MARKER = '${}'

export function hasMarker(text: string): boolean {
  return text.includes(FUZZ_MARKER)
}

export function applyPayload(template: string, payload: string): string {
  return template.split(FUZZ_MARKER).join(payload)
}

const RANGE = /^(-?\d+)\.\.(-?\d+)(?:\.\.(\d+))?$/
const MAX_RANGE = 10000

export function expandLine(line: string): string[] {
  const m = RANGE.exec(line.trim())
  if (!m) return [line]
  const start = parseInt(m[1], 10)
  const end = parseInt(m[2], 10)
  const step = m[3] ? Math.max(1, parseInt(m[3], 10)) : 1
  const pad =
    /^0\d/.test(m[1]) || /^0\d/.test(m[2])
      ? Math.max(m[1].length, m[2].length)
      : 0
  const fmt = (n: number) => String(n).padStart(pad, '0')
  const out: string[] = []
  if (start <= end) {
    for (let i = start; i <= end && out.length < MAX_RANGE; i += step) out.push(fmt(i))
  } else {
    for (let i = start; i >= end && out.length < MAX_RANGE; i -= step) out.push(fmt(i))
  }
  return out
}

export function parsePayloads(text: string): string[] {
  const out: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '')
    if (line.length === 0) continue
    out.push(...expandLine(line))
  }
  return out
}
