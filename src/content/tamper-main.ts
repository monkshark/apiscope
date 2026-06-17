import type { TamperRule } from '../core/tamper'
import { pickRule, applyTamper } from '../core/tamper'

let rules: TamperRule[] = []

window.addEventListener('message', (e) => {
  if (e.source !== window) return
  const data = e.data as { __apiScopeTamper?: string; rules?: TamperRule[] }
  if (data && data.__apiScopeTamper === 'rules') {
    rules = Array.isArray(data.rules) ? data.rules : []
  }
})

function clampStatus(status: number | null, fallback: number): number {
  if (status == null) return fallback
  if (status < 200 || status > 599) return fallback
  return status
}

const originalFetch = window.fetch
window.fetch = async function patchedFetch(
  this: typeof window,
  ...args: Parameters<typeof fetch>
) {
  const response = await originalFetch.apply(this, args)
  try {
    const input = args[0]
    const init = args[1]
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input instanceof Request
            ? input.url
            : String(input)
    const method = (
      init?.method ||
      (input instanceof Request ? input.method : 'GET')
    ).toUpperCase()
    const rule = pickRule(rules, url, method)
    if (!rule) return response
    const text = await response.clone().text()
    const body = applyTamper(rule, text)
    return new Response(body, {
      status: clampStatus(rule.statusOverride, response.status || 200),
      statusText: response.statusText,
      headers: new Headers(response.headers),
    })
  } catch {
    return response
  }
} as typeof fetch

const OriginalXHR = window.XMLHttpRequest

class TamperingXHR extends OriginalXHR {
  private __ti_url = ''
  private __ti_method = 'GET'

  constructor() {
    super()
    this.addEventListener('readystatechange', () => {
      if (this.readyState !== 4) return
      try {
        const rule = pickRule(rules, this.__ti_url, this.__ti_method)
        if (!rule) return
        const type = this.responseType
        let original: string | null = null
        if (type === '' || type === 'text') {
          original = super.responseText
        } else if (type === 'json') {
          try {
            original = JSON.stringify(super.response)
          } catch {
            original = null
          }
        }
        if (original == null) return
        const body = applyTamper(rule, original)
        Object.defineProperty(this, 'responseText', {
          configurable: true,
          get: () => body,
        })
        Object.defineProperty(this, 'response', {
          configurable: true,
          get: () => {
            if (type === 'json') {
              try {
                return JSON.parse(body)
              } catch {
                return null
              }
            }
            return body
          },
        })
        if (rule.statusOverride != null) {
          const status = clampStatus(rule.statusOverride, super.status || 200)
          Object.defineProperty(this, 'status', {
            configurable: true,
            get: () => status,
          })
        }
      } catch {
        return
      }
    })
  }

  open(method: string, url: string | URL, ...rest: unknown[]): void {
    this.__ti_method = String(method).toUpperCase()
    this.__ti_url = typeof url === 'string' ? url : url.href
    return super.open(
      method,
      url as string,
      ...(rest as [boolean, (string | null)?, (string | null)?]),
    )
  }
}

window.XMLHttpRequest = TamperingXHR as unknown as typeof XMLHttpRequest

window.postMessage({ __apiScopeTamper: 'ready' }, '*')
