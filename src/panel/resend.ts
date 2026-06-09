export interface ResendResult {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  ms: number
  error?: string
}

export interface ResendInput {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
}

const RESULT_KEY = '__apiInspectorResend'
const TIMEOUT_MS = 20000
const POLL_MS = 150

function evalInPage(expression: string): Promise<unknown> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval(expression, (result) => resolve(result))
  })
}

export async function runResend(input: ResendInput): Promise<ResendResult> {
  const empty: ResendResult = {
    status: 0,
    statusText: '',
    headers: {},
    body: '',
    ms: 0,
  }

  const init: RequestInit = {
    method: input.method,
    headers: input.headers,
    credentials: 'include',
  }
  if (input.body && input.method.toUpperCase() !== 'GET') {
    init.body = input.body
  }

  const expr = `(() => {
    window['${RESULT_KEY}'] = '__pending__';
    (async () => {
      const __t = performance.now();
      try {
        const r = await fetch(${JSON.stringify(input.url)}, ${JSON.stringify(init)});
        const b = await r.text();
        const h = {};
        r.headers.forEach((v, k) => { h[k] = v; });
        window['${RESULT_KEY}'] = JSON.stringify({ status: r.status, statusText: r.statusText, headers: h, body: b, ms: Math.round(performance.now() - __t) });
      } catch (e) {
        window['${RESULT_KEY}'] = JSON.stringify({ error: String((e && e.message) || e), ms: Math.round(performance.now() - __t) });
      }
    })();
    return 'started';
  })()`

  await evalInPage(expr)

  const start = Date.now()
  while (Date.now() - start < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS))
    const val = await evalInPage(`window['${RESULT_KEY}']`)
    if (typeof val === 'string' && val !== '__pending__') {
      try {
        return { ...empty, ...(JSON.parse(val) as Partial<ResendResult>) }
      } catch {
        return { ...empty, error: '응답 파싱 실패' }
      }
    }
  }
  return { ...empty, error: '시간 초과 (페이지에서 응답이 없음)' }
}
