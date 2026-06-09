import { create } from 'zustand'
import type { CapturedRequest, ResBodyEntry } from '../../types'
import { EMPTY_FILTER, type FilterState } from '../../core/filter'
import { DEFAULT_MASK_KEYS } from '../../core/mask'
import { decodeContent } from '../../core/mime'
import { clearRaw, removeRaw, getRaw } from '../rawEntries'

interface InspectorState {
  requests: CapturedRequest[]
  selectedId: string | null
  selectedIds: string[]
  paused: boolean
  maskEnabled: boolean
  safeShare: boolean
  maskKeys: string[]
  maxEntries: number
  filter: FilterState
  resBodies: Record<string, ResBodyEntry>
  diffBaseId: string | null
  diffCompareId: string | null
  variables: Record<string, string>
  addRequest: (req: CapturedRequest) => void
  clear: () => void
  select: (id: string | null) => void
  setSelection: (ids: string[], primary: string | null) => void
  togglePaused: () => void
  toggleMask: () => void
  toggleSafeShare: () => void
  setFilter: (patch: Partial<FilterState>) => void
  setResBody: (id: string, entry: ResBodyEntry) => void
  setDiffBase: (id: string | null) => void
  setDiffCompare: (id: string | null) => void
  clearDiff: () => void
  setVariables: (vars: Record<string, string>) => void
  importEntries: (
    reqs: CapturedRequest[],
    bodies: Record<string, ResBodyEntry>,
  ) => void
  prefetchBodies: () => void
}

export const useInspectorStore = create<InspectorState>((set, get) => ({
  requests: [],
  selectedId: null,
  selectedIds: [],
  paused: false,
  maskEnabled: true,
  safeShare: true,
  maskKeys: DEFAULT_MASK_KEYS,
  maxEntries: 1000,
  filter: EMPTY_FILTER,
  resBodies: {},
  diffBaseId: null,
  diffCompareId: null,
  variables: {},

  addRequest: (req) =>
    set((state) => {
      const next = [...state.requests, req]
      if (next.length > state.maxEntries) {
        const overflow = next.length - state.maxEntries
        for (const d of next.slice(0, overflow)) removeRaw(d.id)
        return { requests: next.slice(overflow) }
      }
      return { requests: next }
    }),

  clear: () => {
    clearRaw()
    set({
      requests: [],
      selectedId: null,
      selectedIds: [],
      resBodies: {},
      diffBaseId: null,
      diffCompareId: null,
    })
  },

  select: (id) => set({ selectedId: id, selectedIds: id ? [id] : [] }),
  setSelection: (ids, primary) =>
    set({ selectedIds: ids, selectedId: primary }),
  togglePaused: () => set((state) => ({ paused: !state.paused })),
  toggleMask: () => set((state) => ({ maskEnabled: !state.maskEnabled })),
  toggleSafeShare: () => set((state) => ({ safeShare: !state.safeShare })),
  setFilter: (patch) =>
    set((state) => ({ filter: { ...state.filter, ...patch } })),

  setResBody: (id, entry) =>
    set((state) => ({ resBodies: { ...state.resBodies, [id]: entry } })),

  setDiffBase: (id) => set({ diffBaseId: id }),
  setDiffCompare: (id) => set({ diffCompareId: id }),
  clearDiff: () => set({ diffCompareId: null }),
  setVariables: (vars) => set({ variables: vars }),

  importEntries: (reqs, bodies) => {
    clearRaw()
    set({
      requests: reqs.slice(-get().maxEntries),
      resBodies: bodies,
      selectedId: null,
      selectedIds: [],
      diffBaseId: null,
      diffCompareId: null,
    })
  },

  prefetchBodies: () => {
    const { requests, resBodies, setResBody } = get()
    for (const req of requests) {
      const existing = resBodies[req.id]
      if (existing && existing.state !== 'idle') continue
      const raw = getRaw(req.id)
      if (!raw || typeof raw.getContent !== 'function') continue
      raw.getContent((content, encoding) => {
        setResBody(req.id, decodeContent(content, encoding, req.resMime))
      })
    }
  },
}))
