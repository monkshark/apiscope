import { useState } from 'react'

function Node({ name, value, depth }: { name?: string; value: unknown; depth: number }) {
  const [open, setOpen] = useState(depth < 2)
  const isArray = Array.isArray(value)
  const isObject = value !== null && typeof value === 'object'

  if (!isObject) {
    return (
      <div style={{ paddingLeft: depth * 12 }} className="font-mono text-[11.5px] leading-5">
        {name !== undefined && (
          <span>
            <span className="text-jkey">{name}</span>
            <span className="text-jpun">: </span>
          </span>
        )}
        <ValueLeaf value={value} />
      </div>
    )
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>)

  return (
    <div style={{ paddingLeft: depth * 12 }} className="font-mono text-[11.5px] leading-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-mut hover:text-tx"
      >
        <span className="inline-block w-3">{open ? '▾' : '▸'}</span>
        {name !== undefined && <span className="text-jkey">{name}</span>}
        <span className="text-jpun">{name !== undefined ? ': ' : ''}</span>
        <span className="text-mut">
          {isArray ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      {open &&
        entries.map(([k, v]) => <Node key={k} name={k} value={v} depth={depth + 1} />)}
    </div>
  )
}

function ValueLeaf({ value }: { value: unknown }) {
  if (typeof value === 'string')
    return <span className="text-jstr">"{value}"</span>
  if (typeof value === 'number')
    return <span className="text-jnum">{value}</span>
  if (typeof value === 'boolean')
    return <span className="text-jlit">{String(value)}</span>
  return <span className="text-jlit">null</span>
}

export default function JsonTree({ data }: { data: unknown }) {
  return <Node value={data} depth={0} />
}
