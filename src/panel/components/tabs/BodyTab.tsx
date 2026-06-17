import { useMemo, useState } from 'react'
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
    <pre className="whitespace-pre-wrap break-all font-mono text-[11.5px] text-tx">
      {segs.map((s, i) =>
        s.match ? (
          <mark key={i} className="bg-amb text-black">
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
    <div className="mb-1 inline-flex gap-0.5">
      {(['raw', 'tree'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={
            'flex h-[22px] items-center rounded-md px-2 text-[10px] ' +
            (view === v
              ? 'bg-acc font-medium text-white'
              : 'bg-[color-mix(in_srgb,var(--mut)_16%,transparent)] text-tx')
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
  if (body.kind === 'none')
    return <p className="text-[11.5px] text-mut">No request body</p>
  if (body.kind === 'json') {
    return body.parsed !== undefined ? (
      <JsonTree data={maskDeep(body.parsed, mask)} />
    ) : (
      <pre className="whitespace-pre-wrap break-all font-mono text-[11.5px] text-tx">
        {maskText(body.raw, mask)}
      </pre>
    )
  }
  if (body.kind === 'text') {
    return (
      <pre className="whitespace-pre-wrap break-all font-mono text-[11.5px] text-tx">
        {maskText(body.raw, mask)}
      </pre>
    )
  }
  if (body.kind === 'form') {
    return (
      <div className="space-y-0.5 font-mono text-[11.5px] text-tx">
        {body.pairs.map(([k, v], i) => (
          <div key={i}>
            <span className="text-jlit">{k}</span> = {maskText(v, mask)}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-0.5 font-mono text-[11.5px] text-tx">
      {body.parts.map((p, i) => (
        <div key={i}>
          <span className="text-jlit">{p.name}</span>
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

  const computed = useMemo(() => {
    if (!entry || entry.state === 'idle' || entry.state === 'loading' || entry.state === 'error' || entry.state === 'binary') {
      return null
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
    return { parsed, treeOk, display }
  }, [entry, mask, req.resMime])

  if (!entry || entry.state === 'idle' || entry.state === 'loading') {
    return <p className="text-[11.5px] text-mut">Loading…</p>
  }
  if (entry.state === 'error') {
    return <p className="text-[11.5px] text-red">Could not load the response body.</p>
  }
  if (entry.state === 'binary') {
    return <p className="text-[11.5px] text-mut">[binary response — preview omitted]</p>
  }

  const { parsed, treeOk, display } = computed!

  return (
    <div>
      {entry.state === 'truncated' && (
        <p className="mb-1 text-[11px] text-amb">
          ⚠ Response is large — only part is shown.
        </p>
      )}
      <div className="mb-1 flex items-center gap-2">
        {treeOk && <BodyViewToggle view={view} onChange={setView} />}
        {(!treeOk || view === 'raw') && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search response (regex)"
            className="h-[22px] w-40 rounded-md border border-bd bg-bg px-2 text-[11px] text-tx outline-none"
          />
        )}
      </div>
      {treeOk && view === 'tree' ? (
        <JsonTree data={parsed} />
      ) : search ? (
        <HighlightedPre text={display} query={search} />
      ) : (
        <pre className="whitespace-pre-wrap break-all font-mono text-[11.5px] text-tx">
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
        <h3 className="mb-1 text-[10px] uppercase tracking-[0.09em] text-mut">
          Request Body
        </h3>
        <RequestBodyView req={req} mask={mask} />
      </div>
      <div>
        <h3 className="mb-1 text-[10px] uppercase tracking-[0.09em] text-mut">
          Response Body
        </h3>
        <ResponseBodyView req={req} mask={mask} />
      </div>
    </div>
  )
}
