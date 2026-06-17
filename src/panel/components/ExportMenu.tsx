import { useState } from 'react'
import { useInspectorStore } from '../store/useInspectorStore'
import { toPostman } from '../../core/convert/toPostman'
import { toMarkdown } from '../../core/export/toMarkdown'
import { buildSession } from '../../core/session'
import { buildHar } from '../../core/har'
import { shareOptions } from '../share'
import { downloadText } from '../download'

export default function ExportMenu() {
  const [open, setOpen] = useState(false)
  const requests = useInspectorStore((s) => s.requests)
  const resBodies = useInspectorStore((s) => s.resBodies)
  const maskKeys = useInspectorStore((s) => s.maskKeys)
  const safeShare = useInspectorStore((s) => s.safeShare)
  const toggleSafeShare = useInspectorStore((s) => s.toggleSafeShare)

  const run = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  const all = () => requests
  const bodiesFor = (reqs: { id: string }[]) => {
    const ids = new Set(reqs.map((r) => r.id))
    return Object.fromEntries(
      Object.entries(resBodies).filter(([id]) => ids.has(id)),
    )
  }

  const items = [
    {
      label: 'Postman Collection (.json)',
      onClick: () =>
        downloadText(
          'apiscope.postman_collection.json',
          toPostman(all(), shareOptions(safeShare, maskKeys)),
          'application/json',
        ),
    },
    {
      label: 'HAR (.har)',
      onClick: () => {
        const reqs = all()
        downloadText(
          'apiscope.har',
          buildHar(reqs, bodiesFor(reqs), shareOptions(safeShare, maskKeys)),
          'application/json',
        )
      },
    },
    {
      label: 'Endpoint docs (.md)',
      onClick: () =>
        downloadText('api-endpoints.md', toMarkdown(all()), 'text/markdown'),
    },
    {
      label: 'Session (.json, re-importable)',
      rawOnly: true,
      onClick: () => {
        const reqs = all()
        downloadText(
          'apiscope-session.json',
          buildSession(reqs, bodiesFor(reqs)),
          'application/json',
        )
      },
    },
  ]

  const visible = items.filter((item) => !(item.rawOnly && safeShare))

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={requests.length === 0}
        className="flex h-[22px] items-center gap-1 rounded-md border border-bd bg-bg px-2 text-[11px] text-mut disabled:opacity-40"
      >
        ⬇ export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-60 overflow-hidden rounded-lg border border-bd bg-panel text-[12px] shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-2 border-b border-bd px-[11px] py-[9px]">
              <span className="mr-auto text-[11px] text-mut">share mode</span>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  onClick={() => safeShare && toggleSafeShare()}
                  className={
                    'flex h-5 items-center rounded-[5px] px-2 text-[10px] ' +
                    (!safeShare
                      ? 'bg-amb text-white'
                      : 'bg-[color-mix(in_srgb,var(--mut)_16%,transparent)] text-tx')
                  }
                >
                  Raw
                </button>
                <button
                  type="button"
                  onClick={() => !safeShare && toggleSafeShare()}
                  className={
                    'flex h-5 items-center rounded-[5px] px-2 text-[10px] ' +
                    (safeShare
                      ? 'bg-grn text-white'
                      : 'bg-[color-mix(in_srgb,var(--mut)_16%,transparent)] text-tx')
                  }
                >
                  Safe
                </button>
              </div>
            </div>
            <div className="flex flex-col p-1">
              {visible.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => run(item.onClick)}
                  className="rounded-md px-[9px] py-[7px] text-left text-tx hover:bg-acc hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
