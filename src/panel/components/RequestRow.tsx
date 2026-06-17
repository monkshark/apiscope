import type { CapturedRequest } from '../../types'
import { statusClass } from '../../core/filter'
import { statusLabel, statusPhrase } from '../../core/status'
import { formatBytes, formatDuration, methodColorVar } from '../util'

function statusColor(status: number): string {
  const cls = statusClass(status)
  if (cls === '2xx') return 'text-grn'
  if (cls === '3xx') return 'text-sky'
  if (cls === '4xx') return 'text-amb'
  if (cls === '5xx') return 'text-red'
  return 'text-mut'
}

export default function RequestRow({
  req,
  selected,
  onSelect,
  onContextMenu,
}: {
  req: CapturedRequest
  selected: boolean
  onSelect: (e: React.MouseEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const highlight = req.status === 401 || req.status === 403
  const reason = req.status ? statusPhrase(req.status, req.statusText) : ''

  return (
    <div
      onClick={onSelect}
      onContextMenu={onContextMenu}
      style={{
        height: 25,
        boxShadow: selected ? 'inset 2px 0 0 var(--acc)' : undefined,
        background: selected
          ? 'var(--sel)'
          : highlight
            ? 'var(--ambg)'
            : undefined,
      }}
      className={
        'grid cursor-default select-none grid-cols-[3rem_1fr_7rem_4rem_4rem_4rem] items-center gap-2 border-b border-bd px-2.5 text-[12px] ' +
        (selected ? '' : 'hover:bg-[var(--hov)]')
      }
    >
      <span
        className="rounded text-center text-[9.5px] font-medium"
        style={{ color: methodColorVar(req.method), padding: '2px 0' }}
      >
        {req.method}
      </span>
      <span className="truncate text-tx" title={req.url}>
        {req.path}
      </span>
      <span
        className="flex gap-1.5 overflow-hidden"
        title={statusLabel(req.status, req.statusText)}
      >
        <span className={statusColor(req.status)}>
          {req.status ? req.status : '—'}
        </span>
        {reason && <span className="truncate text-mut">{reason}</span>}
      </span>
      <span className="truncate text-right text-mut">{req.type}</span>
      <span className="text-right text-mut">{formatDuration(req.durationMs)}</span>
      <span className="text-right text-mut">{formatBytes(req.sizeBytes)}</span>
    </div>
  )
}
