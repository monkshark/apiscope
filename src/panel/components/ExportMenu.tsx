import { useState } from 'react'
import { useInspectorStore } from '../store/useInspectorStore'
import { applyFilter } from '../../core/filter'
import { toPostman } from '../../core/convert/toPostman'
import { toMarkdown } from '../../core/export/toMarkdown'
import { downloadText } from '../download'

export default function ExportMenu() {
  const [open, setOpen] = useState(false)
  const requests = useInspectorStore((s) => s.requests)
  const filter = useInspectorStore((s) => s.filter)
  const resBodies = useInspectorStore((s) => s.resBodies)
  const maskEnabled = useInspectorStore((s) => s.maskEnabled)
  const maskKeys = useInspectorStore((s) => s.maskKeys)
  const placeholderMode = useInspectorStore((s) => s.placeholderMode)

  const run = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  const filtered = () => applyFilter(requests, filter, resBodies)

  const items = [
    {
      label: 'Postman Collection (.json)',
      onClick: () =>
        downloadText(
          'api-inspector.postman_collection.json',
          toPostman(filtered(), {
            mask: maskEnabled,
            maskKeys,
            placeholders: placeholderMode,
          }),
          'application/json',
        ),
    },
    {
      label: 'Endpoint docs (.md)',
      onClick: () =>
        downloadText(
          'api-endpoints.md',
          toMarkdown(filtered()),
          'text/markdown',
        ),
    },
    {
      label: 'Raw JSON (.json)',
      onClick: () =>
        downloadText(
          'api-inspector.json',
          JSON.stringify(filtered(), null, 2),
          'application/json',
        ),
    },
  ]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={requests.length === 0}
        className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 enabled:hover:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-700 dark:text-zinc-300"
      >
        ⬇ export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 min-w-52 overflow-hidden rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => run(item.onClick)}
                className="block w-full px-3 py-1.5 text-left text-zinc-700 hover:bg-indigo-600 hover:text-white dark:text-zinc-200"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
