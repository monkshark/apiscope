import { useEffect, useRef, useState } from 'react'
import DecodePanel from '../panel/components/decode/DecodePanel'

const PENDING_KEY = 'decode:pending'

interface Pending {
  text: string
  nonce: number
}

const iconUrl = chrome.runtime.getURL('icons/icon-32.png')

export default function App() {
  const [value, setValue] = useState('')
  const [fromSelection, setFromSelection] = useState(false)
  const lastNonce = useRef<number | null>(null)

  useEffect(() => {
    let active = true

    const apply = (pending: Pending | undefined) => {
      if (!active || !pending || typeof pending.text !== 'string') return
      if (pending.nonce === lastNonce.current) return
      lastNonce.current = pending.nonce
      setValue(pending.text)
      setFromSelection(true)
    }

    void chrome.storage.session
      .get(PENDING_KEY)
      .then((data) => apply(data[PENDING_KEY] as Pending | undefined))

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'session' || !changes[PENDING_KEY]) return
      apply(changes[PENDING_KEY].newValue as Pending | undefined)
    }
    chrome.storage.onChanged.addListener(onChanged)

    return () => {
      active = false
      chrome.storage.onChanged.removeListener(onChanged)
    }
  }, [])

  return (
    <div className="flex h-full w-full flex-col bg-bg text-tx">
      <header className="flex flex-none items-center gap-2.5 border-b border-bd p-3">
        <img
          src={iconUrl}
          alt=""
          className="h-[22px] w-[22px] flex-none rounded-md"
        />
        <span className="text-[13px] font-semibold tracking-[-0.01em]">
          Decode
        </span>
        {fromSelection && (
          <span className="ml-auto text-[11px] text-mut">from selection</span>
        )}
        <button
          type="button"
          aria-label="Close"
          onClick={() => window.close()}
          className={
            (fromSelection ? '' : 'ml-auto ') +
            'flex h-6 w-6 flex-none items-center justify-center rounded-md text-mut transition hover:bg-[#eaeef2] hover:text-tx dark:hover:bg-[#21262d]'
          }
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <DecodePanel value={value} onChange={setValue} />
        {!value.trim() && (
          <div className="mt-3 rounded-lg border border-bd bg-panel p-3.5 text-[12px] leading-[1.65] text-mut">
            <p>
              Select text on the page, right-click, and choose{' '}
              <span className="text-tx">Decode selection</span>.
            </p>
            <p className="mt-2">
              Or paste a value above — JWT, Base64, Base64URL, URL-encoded,
              Hex, UUID, or a Unix timestamp.
            </p>
            <p className="mt-2">
              Shortcut{' '}
              <span className="font-mono text-tx">Alt+Shift+D</span> decodes the
              current selection.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
