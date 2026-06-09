import { useEffect, useRef, useState } from 'react'
import type { CapturedRequest } from '../../../types'
import { useInspectorStore } from '../../store/useInspectorStore'
import { bodyToString } from '../../../core/diff'
import { applyVars } from '../../../core/vars'
import { statusLabel } from '../../../core/status'
import { statusClass } from '../../../core/filter'
import { prettyJson } from '../../util'
import { runResend, type ResendResult } from '../../resend'
import JsonEditor from '../JsonEditor'
import JsonTree from '../JsonTree'
import AutoTextarea from '../AutoTextarea'

interface HeaderRow {
  key: string
  value: string
}

function statusColor(status: number): string {
  const cls = statusClass(status)
  if (cls === '2xx') return 'text-emerald-600 dark:text-emerald-400'
  if (cls === '3xx') return 'text-sky-600 dark:text-sky-400'
  if (cls === '4xx') return 'text-amber-600 dark:text-amber-400'
  if (cls === '5xx') return 'text-red-600 dark:text-red-400'
  return 'text-zinc-400'
}

function parseVarsText(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    if (k) out[k] = t.slice(i + 1).trim()
  }
  return out
}

function varsToText(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
}

function toRows(headers: Record<string, string>): HeaderRow[] {
  return Object.entries(headers).map(([key, value]) => ({ key, value }))
}

const FIELD =
  'rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs outline-none dark:border-zinc-600 dark:bg-zinc-950'

export default function ResendTab({ req }: { req: CapturedRequest }) {
  const variables = useInspectorStore((s) => s.variables)
  const setVariables = useInspectorStore((s) => s.setVariables)
  const origBody = useInspectorStore((s) => s.resBodies[req.id]?.body)

  const [method, setMethod] = useState(req.method)
  const [url, setUrl] = useState(req.url)
  const [rows, setRows] = useState<HeaderRow[]>(toRows(req.reqHeaders))
  const [bodyText, setBodyText] = useState(prettyJson(bodyToString(req.reqBody)))
  const [varsText, setVarsText] = useState(varsToText(variables))
  const [showVars, setShowVars] = useState(false)
  const [headersOpen, setHeadersOpen] = useState(true)
  const [bodyOpen, setBodyOpen] = useState(true)
  const [bodyView, setBodyView] = useState<'raw' | 'tree'>('raw')
  const [treeState, setTreeState] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResendResult | null>(null)
  const [respView, setRespView] = useState<'raw' | 'tree'>('raw')
  const undoRef = useRef<string[]>([])
  const redoRef = useRef<string[]>([])

  useEffect(() => {
    setMethod(req.method)
    setUrl(req.url)
    setRows(toRows(req.reqHeaders))
    setBodyText(prettyJson(bodyToString(req.reqBody)))
    setBodyView('raw')
    setResult(null)
    undoRef.current = []
    redoRef.current = []
  }, [req.id, req.method, req.url, req.reqHeaders, req.reqBody])

  const enterTree = () => {
    try {
      const v = JSON.parse(bodyText)
      if (v !== null && typeof v === 'object') {
        setTreeState(v)
        setBodyView('tree')
        return
      }
    } catch {
      void 0
    }
    window.alert('유효한 JSON 객체/배열이 아니라 트리로 볼 수 없습니다.')
  }

  const onTreeChange = (next: unknown) => {
    undoRef.current.push(bodyText)
    redoRef.current = []
    setTreeState(next)
    setBodyText(JSON.stringify(next, null, 2))
  }

  const restore = (text: string) => {
    setBodyText(text)
    try {
      setTreeState(JSON.parse(text))
    } catch {
      void 0
    }
  }

  const onTreeKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return
    const z = e.key === 'z' || e.key === 'Z'
    const redo = e.key === 'y' || e.key === 'Y' || (z && e.shiftKey)
    if (z && !e.shiftKey) {
      if (undoRef.current.length === 0) return
      e.preventDefault()
      redoRef.current.push(bodyText)
      restore(undoRef.current.pop() as string)
    } else if (redo) {
      if (redoRef.current.length === 0) return
      e.preventDefault()
      undoRef.current.push(bodyText)
      restore(redoRef.current.pop() as string)
    }
  }

  const updateRow = (i: number, patch: Partial<HeaderRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const removeRow = (i: number) =>
    setRows((rs) => rs.filter((_, idx) => idx !== i))
  const addRow = () => setRows((rs) => [...rs, { key: '', value: '' }])

  const onSend = async () => {
    const v = parseVarsText(varsText)
    setVariables(v)
    const headers: Record<string, string> = {}
    for (const r of rows) {
      const k = applyVars(r.key, v).trim()
      if (k) headers[k] = applyVars(r.value, v)
    }
    setLoading(true)
    setResult(null)
    const res = await runResend({
      method,
      url: applyVars(url, v),
      headers,
      body: applyVars(bodyText, v),
    })
    setResult(res)
    setLoading(false)
  }

  const statusChanged = result && !result.error && result.status !== req.status

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <input
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          title="HTTP 메서드"
          className={FIELD + ' w-20 uppercase'}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          title="요청 URL"
          className={FIELD + ' flex-1'}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={loading}
          className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? '전송 중…' : 'Send'}
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHeadersOpen((o) => !o)}
            className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <span className="inline-block w-3">{headersOpen ? '▾' : '▸'}</span>
            Headers ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => setShowVars((s) => !s)}
            className="ml-auto text-[11px] text-indigo-500 hover:underline"
          >
            {showVars ? '변수 숨기기' : '변수 {{ }}'}
          </button>
        </div>
        {headersOpen && (
        <div className="space-y-1">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                value={row.key}
                onChange={(e) => updateRow(i, { key: e.target.value })}
                placeholder="Header"
                className={FIELD + ' w-40'}
              />
              <span className="text-zinc-400">:</span>
              <input
                value={row.value}
                onChange={(e) => updateRow(i, { value: e.target.value })}
                placeholder="value"
                className={FIELD + ' flex-1'}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                title="삭제"
                className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            className="text-[11px] text-indigo-500 hover:underline"
          >
            + 헤더 추가
          </button>
        </div>
        )}
      </div>

      {showVars && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Variables (key=value, {'{{key}}'} 로 사용)
          </div>
          <AutoTextarea
            value={varsText}
            onChange={(e) => setVarsText(e.target.value)}
            spellCheck={false}
            rows={3}
            placeholder={'AUTH_TOKEN=Bearer abc\nbase=https://api.example.com'}
            className={FIELD + ' w-full resize-none overflow-auto'}
          />
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBodyOpen((o) => !o)}
            className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <span className="inline-block w-3">{bodyOpen ? '▾' : '▸'}</span>
            Body
          </button>
          {bodyOpen && (
          <div className="ml-auto flex items-center gap-1">
            {bodyView === 'raw' && (
              <button
                type="button"
                onClick={() => setBodyText((b) => prettyJson(b))}
                title="JSON 정렬"
                className="text-[11px] text-indigo-500 hover:underline"
              >
                정렬
              </button>
            )}
            <div className="flex overflow-hidden rounded border border-zinc-300 dark:border-zinc-600">
              <button
                type="button"
                onClick={() => setBodyView('raw')}
                className={
                  'px-2 py-0.5 text-[11px] font-medium ' +
                  (bodyView === 'raw'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700')
                }
              >
                Raw
              </button>
              <button
                type="button"
                onClick={() => (bodyView === 'tree' ? undefined : enterTree())}
                className={
                  'px-2 py-0.5 text-[11px] font-medium ' +
                  (bodyView === 'tree'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700')
                }
              >
                Tree
              </button>
            </div>
          </div>
          )}
        </div>
        {bodyOpen &&
          (bodyView === 'raw' ? (
            <AutoTextarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              spellCheck={false}
              rows={4}
              className={FIELD + ' w-full resize-none overflow-auto'}
            />
          ) : (
            <div
              onKeyDown={onTreeKeyDown}
              className="rounded border border-zinc-200 p-2 dark:border-zinc-700"
            >
              <JsonEditor value={treeState} onChange={onTreeChange} />
            </div>
          ))}
      </div>

      <div>
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Response
          {statusChanged && (
            <span className="rounded bg-amber-100 px-1.5 font-normal normal-case text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              원본 {statusLabel(req.status, req.statusText)} → 변경됨
            </span>
          )}
        </div>
        {!result && (
          <p className="text-xs text-zinc-400">
            Send를 누르면 현재 페이지 세션으로 재전송하고 응답을 보여줍니다.
          </p>
        )}
        {result?.error && (
          <p className="text-xs text-red-500">재전송 실패: {result.error}</p>
        )}
        {result && !result.error && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 text-xs">
              <span
                className={'font-mono font-semibold ' + statusColor(result.status)}
              >
                {statusLabel(result.status, result.statusText)}
              </span>
              <span className="text-zinc-400">{result.ms} ms</span>
            </div>
            {(() => {
              const isJson = (result.headers['content-type'] ?? '').includes(
                'json',
              )
              let parsed: unknown
              let treeOk = false
              if (isJson) {
                try {
                  parsed = JSON.parse(result.body)
                  treeOk = parsed !== null && typeof parsed === 'object'
                } catch {
                  treeOk = false
                }
              }
              return (
                <div>
                  {treeOk && (
                    <div className="mb-1 inline-flex overflow-hidden rounded border border-zinc-300 dark:border-zinc-600">
                      {(['raw', 'tree'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setRespView(v)}
                          className={
                            'px-2 py-0.5 text-[10px] font-medium ' +
                            (respView === v
                              ? 'bg-indigo-600 text-white'
                              : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700')
                          }
                        >
                          {v === 'raw' ? 'Raw' : 'Tree'}
                        </button>
                      ))}
                    </div>
                  )}
                  {treeOk && respView === 'tree' ? (
                    <div className="max-h-64 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-950">
                      <JsonTree data={parsed} />
                    </div>
                  ) : (
                    <pre className="max-h-64 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950">
                      {isJson ? prettyJson(result.body) : result.body}
                    </pre>
                  )}
                </div>
              )
            })()}
            {origBody != null && origBody !== result.body && (
              <details className="text-xs">
                <summary className="cursor-pointer text-zinc-400">
                  원본 응답 본문 (다름)
                </summary>
                <pre className="mt-1 max-h-48 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 font-mono dark:border-zinc-700 dark:bg-zinc-950">
                  {origBody}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
