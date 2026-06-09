import { useState } from 'react'
import type { CapturedRequest, ConvertFormat } from '../../../types'
import { convert } from '../../../core/convert'
import { useInspectorStore } from '../../store/useInspectorStore'
import { copyText } from '../../util'

const FORMATS: { key: ConvertFormat; label: string }[] = [
  { key: 'curl', label: 'cURL' },
  { key: 'httpie', label: 'HTTPie' },
]

export default function ConvertTab({ req }: { req: CapturedRequest }) {
  const maskEnabled = useInspectorStore((s) => s.maskEnabled)
  const maskKeys = useInspectorStore((s) => s.maskKeys)
  const placeholderMode = useInspectorStore((s) => s.placeholderMode)
  const togglePlaceholderMode = useInspectorStore((s) => s.togglePlaceholderMode)
  const [format, setFormat] = useState<ConvertFormat>('curl')
  const [copied, setCopied] = useState(false)

  const output = convert(req, format, {
    mask: maskEnabled,
    maskKeys,
    placeholders: placeholderMode,
  })

  const onCopy = async () => {
    const ok = await copyText(output)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    }
  }

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex gap-1">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFormat(f.key)}
              className={
                'rounded px-2 py-0.5 text-xs font-medium ' +
                (format === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={togglePlaceholderMode}
          disabled={!maskEnabled}
          title="자격증명을 ***대신 $AUTH_TOKEN 변수 자리로 출력"
          className={
            'rounded px-2 py-0.5 text-xs font-medium disabled:opacity-40 ' +
            (placeholderMode
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300')
          }
        >
          {placeholderMode ? '$ placeholder' : '$ placeholder'}
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="ml-auto rounded bg-emerald-600 px-3 py-0.5 text-xs font-medium text-white hover:bg-emerald-500"
        >
          {copied ? '복사됨 ✓' : 'Copy'}
        </button>
      </div>
      {!maskEnabled && (
        <p className="mb-1 text-[11px] text-amber-500">
          ⚠ 마스킹 OFF — 토큰이 그대로 포함됩니다.
        </p>
      )}
      {maskEnabled && placeholderMode && (
        <p className="mb-1 text-[11px] text-zinc-400">
          자격증명이 변수 자리로 출력됨 — 실행 전 값 지정 필요 (예: export
          AUTH_TOKEN=...)
        </p>
      )}
      <pre className="min-h-0 flex-1 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 font-mono text-xs leading-5 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
        {output}
      </pre>
    </div>
  )
}
