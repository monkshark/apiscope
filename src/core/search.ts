export interface SearchMatch {
  start: number
  end: number
  text: string
}

export function findMatches(
  text: string,
  pattern: string,
  caseInsensitive = true,
): SearchMatch[] {
  if (!pattern) return []
  let re: RegExp
  try {
    re = new RegExp(pattern, caseInsensitive ? 'gi' : 'g')
  } catch {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    re = new RegExp(escaped, caseInsensitive ? 'gi' : 'g')
  }
  const out: SearchMatch[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] })
    if (m.index === re.lastIndex) re.lastIndex++
  }
  return out
}

export interface Segment {
  text: string
  match: boolean
}

export function highlightSegments(
  text: string,
  pattern: string,
  caseInsensitive = true,
): Segment[] {
  const matches = findMatches(text, pattern, caseInsensitive)
  if (matches.length === 0) return [{ text, match: false }]
  const segs: Segment[] = []
  let pos = 0
  for (const m of matches) {
    if (m.start > pos) segs.push({ text: text.slice(pos, m.start), match: false })
    segs.push({ text: text.slice(m.start, m.end), match: true })
    pos = m.end
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), match: false })
  return segs
}
