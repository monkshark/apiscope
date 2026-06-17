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

const RESULT_KEY = '__apiScopeResend'
const TIMEOUT_MS = 20000
const POLL_MS = 150

const FUZZ_ARR_KEY = '__apiScopeFuzz'
const FUZZ_DONE_KEY = '__apiScopeFuzzDone'
const FUZZ_STOP_KEY = '__apiScopeFuzzStop'
const FUZZ_STALL_MS = 30000
const FETCH_TIMEOUT_MS = 20000
const DRAIN = 25

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
        return { ...empty, error: 'Failed to parse response' }
      }
    }
  }
  return { ...empty, error: 'Timed out (no response from page)' }
}

export interface FuzzInput {
  method: string
  headers: Record<string, string>
  template: string
  marker: string
  payloads: string[]
  inUrl: boolean
  baseUrl: string
  baseBody?: string
  concurrency: number
}

export interface FuzzRecord {
  i: number
  status: number
  statusText: string
  body: string
  ms: number
  error?: string
}

export async function runFuzz(
  input: FuzzInput,
  onResults: (recs: FuzzRecord[]) => void,
  isCancelled: () => boolean,
): Promise<void> {
  if (input.payloads.length === 0) return

  const conc = Math.max(1, Math.floor(input.concurrency))

  const expr = `(() => {
    window['${FUZZ_ARR_KEY}'] = [];
    window['${FUZZ_DONE_KEY}'] = false;
    window['${FUZZ_STOP_KEY}'] = false;
    const tmpl = ${JSON.stringify(input.template)};
    const marker = ${JSON.stringify(input.marker)};
    const payloads = ${JSON.stringify(input.payloads)};
    const inUrl = ${input.inUrl ? 'true' : 'false'};
    const baseUrl = ${JSON.stringify(input.baseUrl)};
    const baseBody = ${JSON.stringify(input.baseBody ?? null)};
    const method = ${JSON.stringify(input.method)};
    const headers = ${JSON.stringify(input.headers)};
    const conc = ${conc};
    const isGet = method.toUpperCase() === 'GET';
    const apply = (p) => tmpl.split(marker).join(p);
    (async () => {
      let next = 0;
      async function worker() {
        while (next < payloads.length && !window['${FUZZ_STOP_KEY}']) {
          const i = next++;
          const p = payloads[i];
          const url = inUrl ? apply(p) : baseUrl;
          const body = inUrl ? baseBody : apply(p);
          const init = { method, headers, credentials: 'include' };
          if (body != null && !isGet) init.body = body;
          const ctrl = new AbortController();
          init.signal = ctrl.signal;
          const to = setTimeout(() => ctrl.abort(), ${FETCH_TIMEOUT_MS});
          const t = performance.now();
          try {
            const r = await fetch(url, init);
            const b = await r.text();
            window['${FUZZ_ARR_KEY}'].push({ i, status: r.status, statusText: r.statusText, body: b, ms: Math.round(performance.now() - t) });
          } catch (e) {
            window['${FUZZ_ARR_KEY}'].push({ i, status: 0, statusText: '', body: '', error: String((e && e.message) || e), ms: Math.round(performance.now() - t) });
          } finally {
            clearTimeout(to);
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(conc, payloads.length) }, worker));
      window['${FUZZ_DONE_KEY}'] = true;
    })();
    return 'started';
  })()`

  await evalInPage(expr)

  let lastChange = Date.now()

  const drain = async (): Promise<number> => {
    let n = 0
    for (;;) {
      const slice = await evalInPage(
        `(() => { const a = window['${FUZZ_ARR_KEY}'] || []; return JSON.stringify(a.splice(0, ${DRAIN})); })()`,
      )
      let recs: FuzzRecord[] = []
      if (typeof slice === 'string') {
        try {
          recs = JSON.parse(slice) as FuzzRecord[]
        } catch {
          recs = []
        }
      }
      if (recs.length === 0) break
      n += recs.length
      onResults(recs)
    }
    return n
  }

  for (;;) {
    if (isCancelled()) {
      await evalInPage(`window['${FUZZ_STOP_KEY}'] = true`)
      await drain()
      return
    }
    const got = await drain()
    if (got > 0) lastChange = Date.now()
    const done = await evalInPage(`window['${FUZZ_DONE_KEY}']`)
    if (done === true) {
      await drain()
      return
    }
    if (Date.now() - lastChange > FUZZ_STALL_MS) return
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
}
