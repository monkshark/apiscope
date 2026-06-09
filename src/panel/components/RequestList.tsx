import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useInspectorStore } from '../store/useInspectorStore'
import { applyFilter } from '../../core/filter'
import { convert } from '../../core/convert'
import { maskText } from '../../core/mask'
import { getRaw } from '../rawEntries'
import { copyText } from '../util'
import RequestRow from './RequestRow'
import ContextMenu, { type MenuItem } from './ContextMenu'
import type { CapturedRequest } from '../../types'

interface MenuState {
  x: number
  y: number
  req: CapturedRequest
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-zinc-500">아직 수집된 요청이 없습니다.</p>
      <p className="max-w-xs text-xs text-zinc-400">
        DevTools가 열린 상태에서 발생한 요청만 잡힙니다. 아래 버튼으로 페이지를
        새로고침하세요.
      </p>
      <button
        type="button"
        onClick={() => chrome.devtools.inspectedWindow.reload({})}
        className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
      >
        ↻ 페이지 새로고침
      </button>
    </div>
  )
}

export default function RequestList() {
  const requests = useInspectorStore((s) => s.requests)
  const filter = useInspectorStore((s) => s.filter)
  const resBodies = useInspectorStore((s) => s.resBodies)
  const selectedId = useInspectorStore((s) => s.selectedId)
  const select = useInspectorStore((s) => s.select)
  const maskEnabled = useInspectorStore((s) => s.maskEnabled)
  const maskKeys = useInspectorStore((s) => s.maskKeys)
  const placeholderMode = useInspectorStore((s) => s.placeholderMode)
  const diffBaseId = useInspectorStore((s) => s.diffBaseId)
  const setDiffBase = useInspectorStore((s) => s.setDiffBase)
  const setDiffCompare = useInspectorStore((s) => s.setDiffCompare)

  const [menu, setMenu] = useState<MenuState | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () => applyFilter(requests, filter, resBodies),
    [requests, filter, resBodies],
  )

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 25,
    overscan: 12,
  })

  const menuItems: MenuItem[] = menu
    ? [
        {
          label: 'Copy as cURL',
          onClick: () =>
            void copyText(
              convert(menu.req, 'curl', {
                mask: maskEnabled,
                maskKeys,
                placeholders: placeholderMode,
              }),
            ),
        },
        { label: 'Copy URL', onClick: () => void copyText(menu.req.url) },
        {
          label: 'Copy response',
          onClick: () => {
            const raw = getRaw(menu.req.id)
            raw?.getContent((content) =>
              void copyText(maskText(content ?? '', maskEnabled)),
            )
          },
        },
        { label: 'Diff 기준으로 설정', onClick: () => setDiffBase(menu.req.id) },
        ...(diffBaseId && diffBaseId !== menu.req.id
          ? [
              {
                label: '기준과 비교 (diff)',
                onClick: () => setDiffCompare(menu.req.id),
              },
            ]
          : []),
      ]
    : []

  if (requests.length === 0) {
    return (
      <div className="min-w-0 flex-1 border-r border-zinc-200 dark:border-zinc-700">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col border-r border-zinc-200 dark:border-zinc-700">
      <div className="grid grid-cols-[3rem_1fr_3rem_4rem_4rem_4rem] gap-2 border-b border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
        <span>Mtd</span>
        <span>Path</span>
        <span className="text-right">St</span>
        <span className="text-right">Type</span>
        <span className="text-right">Time</span>
        <span className="text-right">Size</span>
      </div>
      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        <div
          style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
        >
          {virtualizer.getVirtualItems().map((vi) => {
            const req = filtered[vi.index]
            return (
              <div
                key={req.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <RequestRow
                  req={req}
                  selected={req.id === selectedId}
                  onSelect={() => select(req.id)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    select(req.id)
                    setMenu({ x: e.clientX, y: e.clientY, req })
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}
