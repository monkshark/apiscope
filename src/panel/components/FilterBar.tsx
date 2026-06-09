import { useRef, useState } from 'react'
import { useInspectorStore } from '../store/useInspectorStore'
import { isValidRegex } from '../../core/filter'
import { parseImport } from '../../core/session'
import { isDevtools } from '../env'
import ExportMenu from './ExportMenu'
import ToolsModal from './ToolsModal'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const STATUS_CLASSES = ['2xx', '3xx', '4xx', '5xx']

function Toggle({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={
        'rounded px-2 py-0.5 text-xs font-medium transition ' +
        (active
          ? 'bg-indigo-600 text-white'
          : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600')
      }
    >
      {children}
    </button>
  )
}

export default function FilterBar() {
  const filter = useInspectorStore((s) => s.filter)
  const setFilter = useInspectorStore((s) => s.setFilter)
  const paused = useInspectorStore((s) => s.paused)
  const togglePaused = useInspectorStore((s) => s.togglePaused)
  const maskEnabled = useInspectorStore((s) => s.maskEnabled)
  const toggleMask = useInspectorStore((s) => s.toggleMask)
  const clear = useInspectorStore((s) => s.clear)
  const importEntries = useInspectorStore((s) => s.importEntries)
  const prefetchBodies = useInspectorStore((s) => s.prefetchBodies)

  const fileRef = useRef<HTMLInputElement>(null)
  const [showTools, setShowTools] = useState(false)
  const regexOk = isValidRegex(filter.query)

  const toggleIn = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { requests, resBodies } = parseImport(await file.text(), Date.now())
      importEntries(requests, resBodies)
    } catch (err) {
      window.alert(`가져오기 실패: ${(err as Error).message}`)
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-zinc-100 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
      <input
        value={filter.query}
        onChange={(e) => setFilter({ query: e.target.value })}
        placeholder="filter (regex)"
        className={
          'w-40 rounded border px-2 py-1 text-xs outline-none ' +
          (regexOk
            ? 'border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900'
            : 'border-red-400 bg-red-50 dark:bg-red-950')
        }
      />
      <div className="flex items-center gap-1">
        <input
          value={filter.bodyQuery}
          onChange={(e) => setFilter({ bodyQuery: e.target.value })}
          placeholder="본문 검색"
          className="w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-xs outline-none dark:border-zinc-600 dark:bg-zinc-900"
        />
        {filter.bodyQuery && (
          <button
            type="button"
            onClick={prefetchBodies}
            title="검색을 위해 응답 본문을 모두 불러옵니다"
            className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
          >
            본문 로드
          </button>
        )}
      </div>
      <div className="flex gap-1">
        {METHODS.map((m) => (
          <Toggle
            key={m}
            active={filter.methods.includes(m)}
            onClick={() => setFilter({ methods: toggleIn(filter.methods, m) })}
          >
            {m}
          </Toggle>
        ))}
      </div>
      <div className="flex gap-1">
        {STATUS_CLASSES.map((s) => (
          <Toggle
            key={s}
            active={filter.statusClasses.includes(s)}
            onClick={() =>
              setFilter({ statusClasses: toggleIn(filter.statusClasses, s) })
            }
          >
            {s}
          </Toggle>
        ))}
      </div>
      <Toggle
        active={filter.hideStaticAssets}
        onClick={() => setFilter({ hideStaticAssets: !filter.hideStaticAssets })}
        title="정적 자원 숨김"
      >
        no-static
      </Toggle>
      <div className="ml-auto flex items-center gap-1">
        <input
          ref={fileRef}
          type="file"
          accept=".har,.json,application/json"
          onChange={onFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
        >
          📂 import
        </button>
        <button
          type="button"
          onClick={() => setShowTools(true)}
          title="인코더/디코더 · 해시 · 응답 스캔"
          className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
        >
          🛠 tools
        </button>
        <Toggle active={maskEnabled} onClick={toggleMask} title="민감 헤더 마스킹">
          {maskEnabled ? '● mask' : '○ mask'}
        </Toggle>
        {isDevtools && (
          <Toggle active={paused} onClick={togglePaused} title="수집 일시정지">
            {paused ? '▶ resume' : '⏸ pause'}
          </Toggle>
        )}
        <ExportMenu />
        <button
          type="button"
          onClick={clear}
          className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
        >
          🗑 clear
        </button>
      </div>
      {showTools && <ToolsModal onClose={() => setShowTools(false)} />}
    </div>
  )
}
