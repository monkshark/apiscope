export type TamperBodyMode = 'replace' | 'merge'

export interface TamperRule {
  id: string
  enabled: boolean
  urlPattern: string
  methods: string[]
  statusOverride: number | null
  bodyMode: TamperBodyMode
  body: string
}

export const TAMPER_STORAGE_KEY = 'apiScopeTamperRules'

export function ruleMatches(
  rule: TamperRule,
  url: string,
  method: string,
): boolean {
  if (!rule.enabled) return false
  if (
    rule.methods.length > 0 &&
    !rule.methods.includes(method.toUpperCase())
  ) {
    return false
  }
  try {
    return new RegExp(rule.urlPattern).test(url)
  } catch {
    return false
  }
}

export function pickRule(
  rules: TamperRule[],
  url: string,
  method: string,
): TamperRule | null {
  for (const rule of rules) {
    if (ruleMatches(rule, url, method)) return rule
  }
  return null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function deepMerge(base: unknown, patch: unknown): unknown {
  if (isPlainObject(base) && isPlainObject(patch)) {
    const out: Record<string, unknown> = { ...base }
    for (const key of Object.keys(patch)) {
      out[key] =
        key in base ? deepMerge(base[key], patch[key]) : patch[key]
    }
    return out
  }
  return patch
}

export function applyTamper(rule: TamperRule, originalBody: string): string {
  if (rule.bodyMode === 'replace') return rule.body
  try {
    const base = JSON.parse(originalBody)
    const patch = JSON.parse(rule.body)
    return JSON.stringify(deepMerge(base, patch))
  } catch {
    return rule.body
  }
}

export function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function makeRule(url: string, method: string): TamperRule {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    urlPattern: escapeForRegExp(url),
    methods: method ? [method.toUpperCase()] : [],
    statusOverride: null,
    bodyMode: 'replace',
    body: '',
  }
}
