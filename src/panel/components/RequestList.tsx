import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useInspectorStore } from '../store/useInspectorStore'
import { applyFilter } from '../../core/filter'
import { parseImport } from '../../core/session'
import { convert } from '../../core/convert'
import { maskText } from '../../core/mask'
import { shareOptions } from '../share'
import { getRaw } from '../rawEntries'
import { copyText } from '../util'
import { isDevtools } from '../env'
import RequestRow from './RequestRow'
import ContextMenu, { type MenuItem } from './ContextMenu'
import type { CapturedRequest } from '../../types'

interface MenuState {
  x: number
  y: number
  req: CapturedRequest
}

function Dropzone() {
  const importEntries = useInspectorStore((s) => s.importEntries)
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const ingest = async (file: File | undefined) => {
    if (!file) return
    try {
      const { requests, resBodies } = parseImport(await file.text(), Date.now())
      importEntries(requests, resBodies)
    } catch (err) {
      window.alert(`Import failed: ${(err as Error).message}`)
    }
  }

  return (
    <div
      className="flex h-full items-center justify-center p-6"
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        void ingest(e.dataTransfer.files?.[0])
      }}
    >
      <div
        className={
          'flex w-[420px] max-w-full flex-col items-center rounded-xl border-[1.5px] border-dashed px-8 py-10 text-center ' +
          (over ? 'border-acc bg-[var(--sel)]' : 'border-bd bg-panel')
        }
      >
        <div className="mb-[18px] flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-bd bg-bg">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 7.5h6l1.8 2.1H21V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19V7.5z"
              stroke="var(--acc)"
              strokeWidth="1.4"
            />
            <path
              d="M12 16.5V10.5M12 10.5l-2.4 2.4M12 10.5l2.4 2.4"
              stroke="var(--acc)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="mb-[7px] text-[15px] font-semibold text-tx">
          Drop a .har or session .json here
        </div>
        <div className="mb-[22px] max-w-[320px] text-[12px] leading-relaxed text-mut">
          or click below — analysis is fully local, nothing leaves your browser
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-8 items-center gap-[7px] rounded-md bg-acc px-4 text-[12.5px] font-medium text-white"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 4.2h4l1.2 1.4H14v7.4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.2z"
              stroke="#fff"
              strokeWidth="1.3"
            />
          </svg>
          Choose file
        </button>
        <div className="mt-[18px] text-[10px] text-mut">
          .har · .json — max 5000 entries
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".har,.json,application/json"
          className="hidden"
          onChange={(e) => {
            void ingest(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

function EmptyState() {
  if (!isDevtools) {
    return <Dropzone />
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2.5 p-6 text-center">
      <p className="text-[11px] text-tx">No requests captured yet.</p>
      <p className="max-w-xs text-[10.5px] leading-relaxed text-mut">
        Only requests made while DevTools is open are captured. Use the button
        below to reload the page.
      </p>
      <button
        type="button"
        onClick={() => chrome.devtools.inspectedWindow.reload({})}
        className="mt-1 flex h-6 items-center rounded-md bg-acc px-[11px] text-[11px] text-white"
      >
        ↻ Reload page
      </button>
    </div>
  )
}

export default function RequestList() {
  const requests = useInspectorStore((s) => s.requests)
  const filter = useInspectorStore((s) => s.filter)
  const resBodies = useInspectorStore((s) => s.resBodies)
  const selectedIds = useInspectorStore((s) => s.selectedIds)
  const select = useInspectorStore((s) => s.select)
  const setSelection = useInspectorStore((s) => s.setSelection)
  const maskEnabled = useInspectorStore((s) => s.maskEnabled)
  const maskKeys = useInspectorStore((s) => s.maskKeys)
  const safeShare = useInspectorStore((s) => s.safeShare)
  const diffBaseId = useInspectorStore((s) => s.diffBaseId)
  const setDiffBase = useInspectorStore((s) => s.setDiffBase)
  const setDiffCompare = useInspectorStore((s) => s.setDiffCompare)

  const [menu, setMenu] = useState<MenuState | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<string | null>(null)

  const filtered = useMemo(
    () => applyFilter(requests, filter, resBodies),
    [requests, filter, resBodies],
  )

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const onRowClick = (e: React.MouseEvent, id: string, index: number) => {
    const current = useInspectorStore.getState().selectedIds
    if (e.shiftKey && anchorRef.current) {
      const anchorIndex = filtered.findIndex((r) => r.id === anchorRef.current)
      if (anchorIndex !== -1) {
        const [a, b] =
          anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex]
        setSelection(
          filtered.slice(a, b + 1).map((r) => r.id),
          id,
        )
        window.getSelection?.()?.removeAllRanges()
        return
      }
    }
    if (e.ctrlKey || e.metaKey) {
      const has = current.includes(id)
      const next = has ? current.filter((x) => x !== id) : [...current, id]
      setSelection(next, has ? (next[next.length - 1] ?? null) : id)
      anchorRef.current = id
      return
    }
    if (current.length === 1 && current[0] === id) {
      select(null)
      anchorRef.current = null
      return
    }
    select(id)
    anchorRef.current = id
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.key !== 'c' && e.key !== 'C')) return
      if (window.getSelection?.()?.toString()) return
      const ids = new Set(useInspectorStore.getState().selectedIds)
      if (ids.size === 0) return
      const text = filtered
        .filter((r) => ids.has(r.id))
        .map((r) => `${r.method} ${r.url}`)
        .join('\n')
      if (!text) return
      e.preventDefault()
      void copyText(text)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered])

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
              convert(menu.req, 'curl', shareOptions(safeShare, maskKeys)),
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
        { label: 'Set as diff base', onClick: () => setDiffBase(menu.req.id) },
        ...(diffBaseId && diffBaseId !== menu.req.id
          ? [
              {
                label: 'Compare with base (diff)',
                onClick: () => setDiffCompare(menu.req.id),
              },
            ]
          : []),
      ]
    : []

  if (requests.length === 0) {
    return (
      <div className="min-w-0 flex-1 border-r border-bd">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col border-r border-bd">
      <div className="grid grid-cols-[3rem_1fr_7rem_4rem_4rem_4rem] items-center gap-2 border-b border-bd bg-panel px-2.5 text-[10px] uppercase tracking-wide text-mut" style={{ height: 26 }}>
        <span>Mtd</span>
        <span>Path</span>
        <span>Status</span>
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
                  selected={selectedSet.has(req.id)}
                  onSelect={(e) => onRowClick(e, req.id, vi.index)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    if (!selectedSet.has(req.id)) select(req.id)
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
