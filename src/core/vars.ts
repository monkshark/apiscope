export function applyVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, key: string) =>
    key in vars ? vars[key] : m,
  )
}

export function extractVars(text: string): string[] {
  const out = new Set<string>()
  const re = /\{\{\s*([\w.-]+)\s*\}\}/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) out.add(match[1])
  return [...out]
}
