import { useState } from 'react'
import type { CapturedRequest } from '../../types'
import { useInspectorStore } from '../store/useInspectorStore'
import { isDevtools } from '../env'
import HeadersTab from './tabs/HeadersTab'
import BodyTab from './tabs/BodyTab'
import QueryTab from './tabs/QueryTab'
import ConvertTab from './tabs/ConvertTab'
import ResendTab from './tabs/ResendTab'
import FuzzTab from './tabs/FuzzTab'

type TabKey = 'headers' | 'body' | 'query' | 'convert' | 'resend' | 'fuzz'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'headers', label: 'Headers' },
  { key: 'body', label: 'Body' },
  { key: 'query', label: 'Query' },
  { key: 'convert', label: 'Convert' },
  ...(isDevtools
    ? [
        { key: 'resend' as const, label: 'Edit/Send' },
        { key: 'fuzz' as const, label: 'Fuzz' },
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
      className="flex min-w-0 shrink-0 flex-col bg-white dark:bg-zinc-900"
    >
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-100 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              'rounded px-2 py-0.5 text-xs font-medium ' +
              (tab === t.key
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-zinc-900 dark:text-indigo-400'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200')
            }
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => select(null)}
          className="ml-auto rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          title="닫기"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'headers' && <HeadersTab req={req} />}
        {tab === 'body' && <BodyTab req={req} />}
        {tab === 'query' && <QueryTab req={req} />}
        {tab === 'convert' && <ConvertTab req={req} />}
        {tab === 'resend' && <ResendTab req={req} />}
        {tab === 'fuzz' && <FuzzTab req={req} />}
      </div>
    </div>
  )
}
