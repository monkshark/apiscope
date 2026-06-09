import { useEffect, useRef, useState } from 'react'
import type { CapturedRequest } from '../../../types'
import { bodyToString } from '../../../core/diff'
import {
  applyPayload,
  parsePayloads,
  hasMarker,
  FUZZ_MARKER,
} from '../../../core/fuzz'
import { statusLabel } from '../../../core/status'
import { statusClass } from '../../../core/filter'
import { copyText } from '../../util'
import { runResend } from '../../resend'

interface FuzzRow {
  payload: string
  status: number
  statusText: string
  length: number
  ms: number
  error?: string
}

const MAX_PAYLOADS = 500
const DELAY_MS = 120
const FIELD =
  'w-full rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs outline-none dark:border-zinc-600 dark:bg-zinc-950'

function statusColor(status: number): string {
  const cls = statusClass(status)
  if (cls === '2xx') return 'text-emerald-600 dark:text-emerald-400'
  if (cls === '3xx') return 'text-sky-600 dark:text-sky-400'
  if (cls === '4xx') return 'text-amber-600 dark:text-amber-400'
  if (cls === '5xx') return 'text-red-600 dark:text-red-400'
  return 'text-zinc-400'
}

function commonLength(rows: FuzzRow[]): number | null {
  const counts = new Map<number, number>()
  for (const r of rows) {
    if (r.error) continue
    counts.set(r.length, (counts.get(r.length) ?? 0) + 1)
  }
  let best: number | null = null
  let max = 0
  for (const [len, c] of counts) {
    if (c > max) {
      max = c
      best = len
    }
  }
  return best
}

export default function FuzzTab({ req }: { req: CapturedRequest }) {
  const [target, setTarget] = useState<'url' | 'body'>('url')
  const [template, setTemplate] = useState(req.url)
  const [payloadsText, setPayloadsText] = useState('')
  const [rows, setRows] = useState<FuzzRow[]>([])
  const [running, setRunning] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTemplate(target === 'url' ? req.url : bodyToString(req.reqBody))
    setRows([])
  }, [req.id, target, req.url, req.reqBody])

  const insertMarker = () => {
    const el = taRef.current
    const pos = el?.selectionStart ?? template.length
    setTemplate(template.slice(0, pos) + FUZZ_MARKER + template.slice(pos))
  }

  const run = async () => {
    if (!hasMarker(template)) {
      window.alert('payload가 들어갈 위치에 ${} 를 넣으세요.')
      return
    }
    const payloads = parsePayloads(payloadsText).slice(0, MAX_PAYLOADS)
    if (payloads.length === 0) return
    setRunning(true)
    setRows([])
    const acc: FuzzRow[] = []
    for (const p of payloads) {
      const url = target === 'url' ? applyPayload(template, p) : req.url
      const body =
        target === 'body' ? applyPayload(template, p) : bodyToString(req.reqBody)
      const res = await runResend({
        method: req.method,
        url,
        headers: req.reqHeaders,
        body,
      })
      acc.push({
        payload: p,
        status: res.status,
        statusText: res.statusText,
        length: (res.body ?? '').length,
        ms: res.ms,
        error: res.error,
      })
      setRows([...acc])
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }
    setRunning(false)
  }

  const common = commonLength(rows)

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-[11px] text-amber-600 dark:text-amber-400">
        인가된 워게임/CTF 대상에서만 사용하세요. 현재 페이지 세션으로 순차
        전송됩니다.
      </p>

      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded border border-zinc-300 dark:border-zinc-600">
          {(['url', 'body'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              className={
                'px-2 py-0.5 text-xs font-medium ' +
                (target === t
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700')
              }
            >
              {t === 'url' ? 'URL' : 'Body'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={insertMarker}
          className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
          title="커서 위치에 ${} 삽입"
        >
          {FUZZ_MARKER} 삽입
        </button>
        <span className="text-[11px] text-zinc-400">
          {req.method} · payload 자리에 {FUZZ_MARKER}
        </span>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="ml-auto rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {running ? `실행 중 ${rows.length}` : 'Run'}
        </button>
      </div>

      <textarea
        ref={taRef}
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        spellCheck={false}
        rows={3}
        className={FIELD + ' resize-y'}
      />

      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Payloads (줄당 하나 · 범위 1..100 · 스텝 1..100..5 · 최대 {MAX_PAYLOADS})
        </div>
        <textarea
          value={payloadsText}
          onChange={(e) => setPayloadsText(e.target.value)}
          spellCheck={false}
          rows={4}
          placeholder={'1..100\nadmin\ntest'}
          className={FIELD + ' resize-y'}
        />
      </div>

      {rows.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            결과 ({rows.length}) — 길이 다른 행이 정답 후보
          </div>
          <div className="overflow-auto rounded border border-zinc-200 dark:border-zinc-700">
            <div className="grid grid-cols-[1fr_5rem_4rem_4rem] gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold uppercase text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
              <span>payload</span>
              <span>status</span>
              <span className="text-right">len</span>
              <span className="text-right">ms</span>
            </div>
            {rows.map((r, i) => {
              const outlier =
                !r.error && common !== null && r.length !== common
              return (
                <div
                  key={i}
                  onClick={() => void copyText(r.payload)}
                  className={
                    'grid cursor-pointer grid-cols-[1fr_5rem_4rem_4rem] gap-1 border-b border-zinc-100 px-2 py-1 text-xs last:border-0 dark:border-zinc-800 ' +
                    (outlier ? 'bg-amber-50 dark:bg-amber-950/30' : '')
                  }
                  title="클릭하면 payload 복사"
                >
                  <span className="truncate font-mono">{r.payload}</span>
                  <span className={'font-mono ' + statusColor(r.status)}>
                    {r.error ? 'ERR' : statusLabel(r.status, r.statusText)}
                  </span>
                  <span className="text-right font-mono text-zinc-500">
                    {r.error ? '—' : r.length}
                  </span>
                  <span className="text-right font-mono text-zinc-400">
                    {r.ms}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
