export const DEFAULT_MASK_KEYS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'x-auth-token',
  'proxy-authorization',
]

const MASK_KEY_PATTERNS = [/token$/i, /secret$/i, /-key$/i]

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'key',
  'secret',
  'password',
])

export interface MaskOptions {
  enabled: boolean
  maskKeys: string[]
}

export function isSensitiveHeader(name: string, maskKeys: string[]): boolean {
  const lower = name.toLowerCase()
  if (maskKeys.some((k) => k.toLowerCase() === lower)) return true
  return MASK_KEY_PATTERNS.some((re) => re.test(lower))
}

export function maskValue(value: string): string {
  const scheme = /^(bearer|basic|digest)\s+(.+)$/i.exec(value)
  if (scheme) return `${scheme[1]} ***MASKED***`
  if (value.length <= 8) return '***MASKED***'
  return `${value.slice(0, 4)}…***MASKED***`
}

export function isCookieHeader(name: string): boolean {
  const n = name.toLowerCase()
  return n === 'cookie' || n === 'set-cookie'
}

export interface CookiePart {
  name: string
  value: string
  hasValue: boolean
}

export function parseCookieParts(value: string): CookiePart[] {
  return value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((t) => {
      const eq = t.indexOf('=')
      if (eq === -1) return { name: t, value: '', hasValue: false }
      return { name: t.slice(0, eq), value: t.slice(eq + 1), hasValue: true }
    })
}

export function isSensitiveQueryKey(key: string): boolean {
  return SENSITIVE_QUERY_KEYS.has(key.toLowerCase())
}

function luhnValid(digits: string): boolean {
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (alt) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

export function maskText(text: string, enabled: boolean): string {
  if (!enabled || !text) return text
  let out = text

  out = out.replace(
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    '***JWT***',
  )

  out = out.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer ***MASKED***')

  out = out.replace(/\d(?:[ -]?\d){12,18}/g, (m) => {
    const digits = m.replace(/[ -]/g, '')
    if (digits.length < 13 || digits.length > 19) return m
    if (!luhnValid(digits)) return m
    return `**** **** **** ${digits.slice(-4)}`
  })

  out = out.replace(/\b(\d{6})-?[1-4]\d{6}\b/g, '$1-*******')

  out = out.replace(
    /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    '$1***@$2',
  )

  return out
}

export function maskDeep(value: unknown, enabled: boolean): unknown {
  if (!enabled) return value
  if (typeof value === 'string') return maskText(value, true)
  if (Array.isArray(value)) return value.map((v) => maskDeep(v, true))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = maskDeep(v, true)
    return out
  }
  return value
}

export function maskHeaders(
  headers: Record<string, string>,
  opts: MaskOptions,
): Record<string, string> {
  if (!opts.enabled) return headers
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    out[key] = isSensitiveHeader(key, opts.maskKeys)
      ? maskValue(value)
      : maskText(value, true)
  }
  return out
}

export function maskUrl(url: string, enabled: boolean): string {
  if (!enabled) return url
  try {
    const u = new URL(url)
    let changed = false
    for (const key of [...u.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        u.searchParams.set(key, '***MASKED***')
        changed = true
      }
    }
    return maskText(changed ? u.toString() : url, true)
  } catch {
    return maskText(url, true)
  }
}

export function hasSensitive(
  headers: Record<string, string>,
  maskKeys: string[],
): boolean {
  return Object.keys(headers).some((k) => isSensitiveHeader(k, maskKeys))
}

export type MaskStyle = 'redact' | 'placeholder-env' | 'placeholder-postman'

function placeholderVarName(key: string): string {
  const k = key.toLowerCase()
  if (k === 'authorization') return 'AUTH_TOKEN'
  if (k === 'cookie') return 'COOKIE'
  if (k === 'x-api-key' || k === 'api-key') return 'API_KEY'
  return key
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function wrapVar(name: string, style: MaskStyle): string {
  return style === 'placeholder-postman' ? `{{${name}}}` : `$${name}`
}

export function maskHeaderValueStyled(
  key: string,
  value: string,
  maskKeys: string[],
  style: MaskStyle,
): string {
  if (!isSensitiveHeader(key, maskKeys)) return maskText(value, true)
  if (style === 'redact') return maskValue(value)
  const name = placeholderVarName(key)
  const scheme = /^(bearer|basic|digest)\s+/i.exec(value)
  return scheme ? `${scheme[1]} ${wrapVar(name, style)}` : wrapVar(name, style)
}

export function maskQueryValueStyled(
  key: string,
  value: string,
  style: MaskStyle,
): string {
  if (!isSensitiveQueryKey(key)) return maskText(value, true)
  if (style === 'redact') return maskValue(value)
  return wrapVar(placeholderVarName(key), style)
}

export function maskUrlStyled(
  url: string,
  style: MaskStyle,
): { url: string; hasPlaceholder: boolean } {
  try {
    const u = new URL(url)
    let hasPlaceholder = false
    for (const key of [...u.searchParams.keys()]) {
      if (!isSensitiveQueryKey(key)) continue
      if (style === 'redact') {
        u.searchParams.set(key, '***MASKED***')
      } else {
        u.searchParams.set(key, wrapVar(placeholderVarName(key), style))
        hasPlaceholder = true
      }
    }
    let out = u.toString()
    if (hasPlaceholder) {
      out = out
        .replace(/%24/g, '$')
        .replace(/%7B%7B/gi, '{{')
        .replace(/%7D%7D/gi, '}}')
    }
    return { url: maskText(out, true), hasPlaceholder }
  } catch {
    return { url: maskText(url, true), hasPlaceholder: false }
  }
}
