import { useEffect, useMemo, useState } from 'react'
import { useInspectorStore } from '../store/useInspectorStore'
import {
  b64encode,
  b64decode,
  b64urlDecode,
  b64urlEncode,
  urlEncode,
  urlDecode,
  hexEncode,
  hexDecode,
  decodeJwt,
  md5,
  sha,
} from '../../core/codec'
import { findMatches } from '../../core/search'
import CopyButton from './CopyButton'

const BTN =
  'shrink-0 whitespace-nowrap self-start rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
const FIELD =
  'w-full rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs outline-none dark:border-zinc-600 dark:bg-zinc-950'

const CONVERTERS: { label: string; fn: (s: string) => string }[] = [
  { label: 'Base64 enc', fn: b64encode },
  { label: 'Base64 dec', fn: b64decode },
  { label: 'Base64URL dec', fn: b64urlDecode },
  { label: 'URL enc', fn: urlEncode },
  { label: 'URL dec', fn: urlDecode },
  { label: 'Hex enc', fn: hexEncode },
  { label: 'Hex dec', fn: hexDecode },
]

function safe(fn: (s: string) => string, input: string): string {
  try {
    return fn(input)
  } catch (e) {
    return `(오류: ${(e as Error).message})`
  }
}

export default function ToolsModal({ onClose }: { onClose: () => void }) {
  const requests = useInspectorStore((s) => s.requests)
  const resBodies = useInspectorStore((s) => s.resBodies)

  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [hashes, setHashes] = useState({ md5: '', sha1: '', sha256: '' })
  const [scanPattern, setScanPattern] = useState('flag\\{[^}]*\\}')
  const [jwtPayloadEdit, setJwtPayloadEdit] = useState('')

  useEffect(() => {
    let cancelled = false
    setHashes((h) => ({ ...h, md5: input ? md5(input) : '' }))
    if (!input) {
      setHashes({ md5: '', sha1: '', sha256: '' })
      return
    }
    Promise.all([sha(input, 'SHA-1'), sha(input, 'SHA-256')]).then(
      ([sha1, sha256]) => {
        if (!cancelled) setHashes({ md5: md5(input), sha1, sha256 })
      },
    )
    return () => {
      cancelled = true
    }
  }, [input])

  const jwt = useMemo(() => decodeJwt(input), [input])

  useEffect(() => {
    if (jwt.valid) setJwtPayloadEdit(JSON.stringify(jwt.payload, null, 2))
  }, [input, jwt.valid, jwt.payload])

  const jwtParts = input.trim().split('.')
  let jwtToken = ''
  if (jwt.valid) {
    try {
      jwtToken = `${jwtParts[0]}.${b64urlEncode(jwtPayloadEdit)}.${jwtParts[2] ?? ''}`
    } catch {
      jwtToken = ''
    }
  }

  const scan = useMemo(() => {
    const out: { path: string; matches: string[] }[] = []
    for (const req of requests) {
      const body = resBodies[req.id]?.body
      if (!body) continue
      const ms = findMatches(body, scanPattern)
      if (ms.length) out.push({ path: req.path, matches: ms.map((m) => m.text) })
    }
    return out
  }, [requests, resBodies, scanPattern])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="flex max-h-full w-[44rem] flex-col rounded-lg bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
          <h2 className="text-sm font-semibold">Tools</h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Encode / Decode
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              rows={3}
              placeholder="여기에 토큰/문자열 붙여넣기"
              className={FIELD + ' resize-y'}
            />
            <div className="my-2 flex flex-wrap gap-1">
              {CONVERTERS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setOutput(safe(c.fn, input))}
                  className={BTN}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setInput(output)}
                className={BTN}
                title="출력을 입력으로"
              >
                ↑ 결과를 입력으로
              </button>
            </div>
            <textarea
              value={output}
              readOnly
              rows={3}
              className={FIELD + ' resize-y bg-zinc-50 dark:bg-zinc-950'}
            />
            <div className="mt-1">
              <CopyButton text={output} className={BTN} />
            </div>
          </div>

          {jwt.valid && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                JWT 편집 (payload 고치면 토큰 자동 조립)
              </div>
              <div className="mb-1 font-mono text-[11px] text-zinc-400">
                header: {JSON.stringify(jwt.header)}
              </div>
              <textarea
                value={jwtPayloadEdit}
                onChange={(e) => setJwtPayloadEdit(e.target.value)}
                spellCheck={false}
                rows={4}
                className={FIELD + ' resize-y'}
              />
              <pre className="mt-1 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950">
                {jwtToken}
              </pre>
              <div className="mt-1">
                <CopyButton text={jwtToken} className={BTN} />
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                서명은 원본 그대로 — 서명 검증 안 하는 서버에서만 통과
              </p>
            </div>
          )}

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Hash
            </div>
            <div className="space-y-1 font-mono text-xs">
              {(['md5', 'sha1', 'sha256'] as const).map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-14 text-zinc-400">{k}</span>
                  <span className="flex-1 break-all">{hashes[k] || '—'}</span>
                  {hashes[k] && <CopyButton text={hashes[k]} className={BTN} />}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              응답 전체 스캔 (정규식)
            </div>
            <input
              value={scanPattern}
              onChange={(e) => setScanPattern(e.target.value)}
              className={FIELD}
            />
            <div className="mt-2 space-y-1 text-xs">
              {scan.length === 0 ? (
                <p className="text-zinc-400">
                  매칭 없음 (로드된 응답 본문에서만 검색됨)
                </p>
              ) : (
                scan.map((r, i) => (
                  <div key={i} className="rounded border border-zinc-200 p-1.5 dark:border-zinc-700">
                    <div className="truncate font-mono text-zinc-500">{r.path}</div>
                    {r.matches.map((m, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className="flex-1 break-all font-mono text-emerald-600 dark:text-emerald-400">
                          {m}
                        </span>
                        <CopyButton text={m} className={BTN} />
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
