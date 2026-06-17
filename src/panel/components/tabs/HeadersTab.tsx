import { useState } from 'react'
import type { CapturedRequest } from '../../../types'
import {
  maskHeaders,
  isSensitiveHeader,
  isCookieHeader,
  parseCookieParts,
} from '../../../core/mask'
import { formatBytes, formatDuration } from '../../util'
import { useInspectorStore } from '../../store/useInspectorStore'
import CopyButton from '../CopyButton'

const TAG_CLASS =
  'shrink-0 rounded border border-bd bg-panel px-[5px] py-px text-[9px] text-mut'

function MaskedTag() {
  return <span className={TAG_CLASS}>masked</span>
}

function CookieRow({
  name,
  raw,
  masked,
}: {
  name: string
  raw: string
  masked: boolean
}) {
  const [open, setOpen] = useState(false)
  const parts = parseCookieParts(raw)
  return (
    <>
      <span className="flex min-w-0 items-start gap-1.5">
        <span className="truncate font-medium text-mut" title={name}>
          {name}
        </span>
        {!masked && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            title="Reveal cookie values"
            className={`${TAG_CLASS} flex items-center gap-1 hover:text-tx`}
          >
            {open ? <span className="text-grn">●</span> : '○'} detail
          </button>
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-[3px] break-all text-tx">
        {parts.map((p, i) => (
          <span key={p.name + i} className="flex items-center gap-[5px]">
            <span>
              <span className={masked ? undefined : 'text-mut'}>{p.name}</span>
              {p.hasValue && (masked || !open ? '=' : `=${p.value}`)}
            </span>
            {p.hasValue &&
              (masked ? (
                <MaskedTag />
              ) : (
                <CopyButton
                  text={p.value}
                  className={`${TAG_CLASS} hover:text-tx`}
                />
              ))}
          </span>
        ))}
      </span>
    </>
  )
}

function HeaderTable({
  title,
  raw,
  maskKeys,
  maskEnabled,
}: {
  title: string
  raw: Record<string, string>
  maskKeys: string[]
  maskEnabled: boolean
}) {
  const masked = maskHeaders(raw, { enabled: maskEnabled, maskKeys })
  const entries = Object.entries(masked)
  return (
    <div className="flex flex-col gap-[7px]">
      <h3 className="text-[10px] uppercase tracking-[0.09em] text-mut">
        {title}
      </h3>
      {entries.length === 0 ? (
        <div className="rounded-lg border border-bd px-[9px] py-1.5 text-[11.5px] text-mut">
          —
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-bd">
          {entries.map(([k, v]) => {
            const sensitive = maskEnabled && isSensitiveHeader(k, maskKeys)
            const cookie = isCookieHeader(k)
            return (
              <div
                key={k}
                className="grid grid-cols-[10rem_1fr] gap-2.5 border-b border-bd px-[9px] py-[5px] text-[11.5px] last:border-0"
              >
                {cookie ? (
                  <CookieRow name={k} raw={raw[k]} masked={sensitive} />
                ) : (
                  <>
                    <span className="truncate font-medium text-mut" title={k}>
                      {k}
                    </span>
                    <span className="flex items-center gap-[7px] break-all text-tx">
                      {sensitive ? <MaskedTag /> : v}
                    </span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function HeadersTab({ req }: { req: CapturedRequest }) {
  const maskEnabled = useInspectorStore((s) => s.maskEnabled)
  const maskKeys = useInspectorStore((s) => s.maskKeys)

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center gap-x-[9px] gap-y-1 text-[12px] text-mut">
        <span>{formatDuration(req.durationMs)}</span>
        <span>{formatBytes(req.sizeBytes)}</span>
        {req.resMime && <span>{req.resMime}</span>}
      </div>
      <HeaderTable
        title="Request Headers"
        raw={req.reqHeaders}
        maskKeys={maskKeys}
        maskEnabled={maskEnabled}
      />
      <HeaderTable
        title="Response Headers"
        raw={req.resHeaders}
        maskKeys={maskKeys}
        maskEnabled={maskEnabled}
      />
    </div>
  )
}
