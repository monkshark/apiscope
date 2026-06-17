import { useRef, useState } from 'react'
import { useInspectorStore } from '../store/useInspectorStore'
import { isDevtools } from '../env'
import FilterBar from './FilterBar'
import RequestList from './RequestList'
import DetailPanel from './DetailPanel'
import StatusBar from './StatusBar'
import DiffPanel from './DiffPanel'
import DiffBaseBanner from './DiffBaseBanner'

const MIN_DETAIL = 320
const MAX_DETAIL = 960
const DEFAULT_DETAIL = 448

function AppBar() {
  const iconUrl = chrome.runtime.getURL('icons/icon-32.png')
  return (
    <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-bd bg-panel px-3">
      <img
        src={iconUrl}
        alt=""
        className="h-[22px] w-[22px] shrink-0 rounded-md"
      />
      <div className="text-[13px] font-semibold tracking-[-0.01em]">
        APIScope
      </div>
      <span className="rounded-[5px] border border-bd bg-bg px-[7px] py-0.5 text-[10px] text-mut">
        Viewer
      </span>
    </div>
  )
}

export default function InspectorShell() {
  const selectedId = useInspectorStore((s) => s.selectedId)
  const selected = useInspectorStore((s) =>
    s.requests.find((r) => r.id === s.selectedId),
  )
  const base = useInspectorStore((s) =>
    s.requests.find((r) => r.id === s.diffBaseId),
  )
  const compare = useInspectorStore((s) =>
    s.requests.find((r) => r.id === s.diffCompareId),
  )
  const clearDiff = useInspectorStore((s) => s.clearDiff)

  const [detailWidth, setDetailWidth] = useState(DEFAULT_DETAIL)
  const dragging = useRef(false)

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const next = window.innerWidth - ev.clientX
      setDetailWidth(Math.min(MAX_DETAIL, Math.max(MIN_DETAIL, next)))
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const showDetail = selectedId && selected

  return (
    <div className="flex h-full w-full flex-col bg-bg text-tx">
      {!isDevtools && <AppBar />}
      <FilterBar />
      <DiffBaseBanner />
      <div className="flex min-h-0 flex-1">
        <RequestList />
        {showDetail && (
          <>
            <div
              onMouseDown={startResize}
              title="Drag to resize"
              className="w-1 shrink-0 cursor-col-resize bg-bd transition-colors hover:bg-acc"
            />
            <DetailPanel req={selected} width={detailWidth} />
          </>
        )}
      </div>
      <StatusBar />
      {base && compare && (
        <DiffPanel base={base} compare={compare} onClose={clearDiff} />
      )}
    </div>
  )
}
