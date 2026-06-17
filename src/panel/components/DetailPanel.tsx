import { useState } from 'react'
import type { CapturedRequest } from '../../types'
import { useInspectorStore } from '../store/useInspectorStore'
import { isDevtools } from '../env'
import { statusClass } from '../../core/filter'
import { statusLabel } from '../../core/status'
import { methodColorVar, hostOf } from '../util'
import HeadersTab from './tabs/HeadersTab'
import BodyTab from './tabs/BodyTab'
import QueryTab from './tabs/QueryTab'
import ConvertTab from './tabs/ConvertTab'
import ResendTab from './tabs/ResendTab'
import FuzzTab from './tabs/FuzzTab'
import TamperTab from './tabs/TamperTab'

function statusColor(status: number): string {
  const cls = statusClass(status)
  if (cls === '2xx') return 'text-grn'
  if (cls === '3xx') return 'text-sky'
  if (cls === '4xx') return 'text-amb'
  if (cls === '5xx') return 'text-red'
  return 'text-mut'
}

type TabKey =
  | 'headers'
  | 'body'
  | 'query'
  | 'convert'
  | 'resend'
  | 'fuzz'
  | 'tamper'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'headers', label: 'Headers' },
  { key: 'body', label: 'Body' },
  { key: 'query', label: 'Query' },
  { key: 'convert', label: 'Convert' },
  ...(isDevtools
    ? [
        { key: 'resend' as const, label: 'Edit/Send' },
        { key: 'fuzz' as const, label: 'Fuzz' },
        { key: 'tamper' as const, label: 'Tamper' },
      ]
    : []),
]

export default function DetailPanel({
  req,
  width,
}: {
  req: CapturedRequest
  width: number
}) {
  const [tab, setTab] = useState<TabKey>('headers')
  const select = useInspectorStore((s) => s.select)

  return (
    <div
      style={{ width }}
      className="flex min-w-0 shrink-0 flex-col bg-bg"
    >
      <div className="flex items-center gap-0.5 border-b border-bd bg-panel px-2" style={{ height: 34 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              'flex h-6 items-center rounded-md px-[11px] text-[11px] ' +
              (tab === t.key
                ? 'bg-bg font-medium text-acc shadow-sm'
                : 'text-mut')
            }
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => select(null)}
          className="ml-auto px-1.5 text-[13px] text-mut"
          title="Close"
        >
          ✕
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-[9px] overflow-hidden border-b border-bd bg-panel px-3.5 py-[7px] text-[11px]">
        <span
          className="shrink-0 rounded font-medium"
          style={{
            color: methodColorVar(req.method),
            fontSize: '9.5px',
            padding: '2px 6px',
          }}
        >
          {req.method}
        </span>
        <span
          className={
            'flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium ' +
            statusColor(req.status)
          }
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          {req.status ? statusLabel(req.status, req.statusText) : 'pending'}
        </span>
        <span className="min-w-0 truncate" title={req.url}>
          <span className="text-mut">{hostOf(req.origin)}</span>
          <span className="text-tx">{req.path}</span>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'headers' && <HeadersTab req={req} />}
        {tab === 'body' && <BodyTab req={req} />}
        {tab === 'query' && <QueryTab req={req} />}
        {tab === 'convert' && <ConvertTab req={req} />}
        {tab === 'resend' && <ResendTab req={req} />}
        {tab === 'fuzz' && <FuzzTab req={req} />}
        {tab === 'tamper' && <TamperTab req={req} />}
      </div>
    </div>
  )
}
