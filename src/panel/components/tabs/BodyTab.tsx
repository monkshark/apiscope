import { useState } from 'react'
import type { CapturedRequest } from '../../../types'
import { useInspectorStore } from '../../store/useInspectorStore'
import { useResponseBody } from '../../hooks/useResponseBody'
import { prettyJson } from '../../util'
import { maskText, maskDeep } from '../../../core/mask'
import { highlightSegments } from '../../../core/search'
import JsonTree from '../JsonTree'

function HighlightedPre({ text, query }: { text: string; query: string }) {
  const segs = highlightSegments(text, query)
  return (
    <pre className="whitespace-pre-wrap break-all font-mono text-xs">
      {segs.map((s, i) =>
        s.match ? (
          <mark key={i} className="bg-amber-300 text-black dark:bg-amber-400">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </pre>
  )
}

function BodyViewToggle({
  view,
  onChange,
}: {
  view: 'raw' | 'tree'
  onChange: (v: 'raw' | 'tree') => void
}) {
  return (
    <div className="mb-1 inline-flex overflow-hidden rounded border border-zinc-300 dark:border-zinc-600">
      {(['raw', 'tree'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={
            'px-2 py-0.5 text-[10px] font-medium ' +
            (view === v
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700')
          }
        >
          {v === 'raw' ? 'Raw' : 'Tree'}
        </button>
      ))}
    </div>
  )
}

function RequestBodyView({ req, mask }: { req: CapturedRequest; mask: boolean }) {
  const body = req.reqBody
  if (body.kind === 'none') return <p className="text-xs text-zinc-400">요청 바디 없음</p>
  if (body.kind === 'json') {
    return body.parsed !== undefined ? (
      <JsonTree data={maskDeep(body.parsed, mask)} />
    ) : (
      <pre className="whitespace-pre-wrap break-all font-mono text-xs">
        {maskText(body.raw, mask)}
      </pre>
    )
  }
  if (body.kind === 'text') {
    return (
      <pre className="whitespace-pre-wrap break-all font-mono text-xs">
        {maskText(body.raw, mask)}
      </pre>
    )
  }
  if (body.kind === 'form') {
    return (
      <div className="space-y-0.5 font-mono text-xs">
        {body.pairs.map(([k, v], i) => (
          <div key={i}>
            <span className="text-violet-600 dark:text-violet-400">{k}</span> ={' '}
            {maskText(v, mask)}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-0.5 font-mono text-xs">
      {body.parts.map((p, i) => (
        <div key={i}>
          <span className="text-violet-600 dark:text-violet-400">{p.name}</span>
          {p.filename ? ` = @${p.filename}` : ' = (field)'}
        </div>
      ))}
    </div>
  )
}

function ResponseBodyView({ req, mask }: { req: CapturedRequest; mask: boolean }) {
  useResponseBody(req.id)
  const entry = useInspectorStore((s) => s.resBodies[req.id])
  const [view, setView] = useState<'raw' | 'tree'>('raw')
  const [search, setSearch] = useState('')

  if (!entry || entry.state === 'idle' || entry.state === 'loading') {
    return <p className="text-xs text-zinc-400">불러오는 중…</p>
  }
  if (entry.state === 'error') {
    return <p className="text-xs text-red-500">응답 본문을 가져오지 못했습니다.</p>
  }
  if (entry.state === 'binary') {
    return <p className="text-xs text-zinc-400">[binary 응답 — 미리보기 생략]</p>
  }

  const isJson = (req.resMime ?? '').includes('json')
  const text = entry.body ?? ''
  let parsed: unknown
  let treeOk = false
  if (isJson) {
    try {
      parsed = maskDeep(JSON.parse(text), mask)
      treeOk = parsed !== null && typeof parsed === 'object'
    } catch {
      treeOk = false
    }
  }
  const display = treeOk
    ? JSON.stringify(parsed, null, 2)
    : isJson
      ? maskText(prettyJson(text), mask)
      : maskText(text, mask)

  return (
    <div>
      {entry.state === 'truncated' && (
        <p className="mb-1 text-[11px] text-amber-500">
          ⚠ 응답이 커서 일부만 표시합니다.
        </p>
      )}
      <div className="mb-1 flex items-center gap-2">
        {treeOk && <BodyViewToggle view={view} onChange={setView} />}
        {(!treeOk || view === 'raw') && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="응답 검색 (정규식)"
            className="w-40 rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs outline-none dark:border-zinc-600 dark:bg-zinc-950"
          />
        )}
      </div>
      {treeOk && view === 'tree' ? (
        <JsonTree data={parsed} />
      ) : search ? (
        <HighlightedPre text={display} query={search} />
      ) : (
        <pre className="whitespace-pre-wrap break-all font-mono text-xs">
          {display}
        </pre>
      )}
    </div>
  )
}

export default function BodyTab({ req }: { req: CapturedRequest }) {
  const mask = useInspectorStore((s) => s.maskEnabled)
  return (
    <div className="space-y-4 p-3">
      <div>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Request Body
        </h3>
        <RequestBodyView req={req} mask={mask} />
      </div>
      <div>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Response Body
        </h3>
        <ResponseBodyView req={req} mask={mask} />
      </div>
    </div>
  )
}
