import { create } from 'zustand'
import type { CapturedRequest, ResBodyEntry } from '../../types'
import { EMPTY_FILTER, type FilterState } from '../../core/filter'
import { DEFAULT_MASK_KEYS } from '../../core/mask'
import { decodeContent } from '../../core/mime'
import { clearRaw, removeRaw, getRaw } from '../rawEntries'
import {
  persistRequest,
  deleteRequest,
  persistResBody,
  clearAll,
  loadAll,
} from '../db'

interface InspectorState {
  requests: CapturedRequest[]
  selectedId: string | null
  paused: boolean
  maskEnabled: boolean
  placeholderMode: boolean
  maskKeys: string[]
  maxEntries: number
  filter: FilterState
  resBodies: Record<string, ResBodyEntry>
  diffBaseId: string | null
  diffCompareId: string | null
  hydrated: boolean
  addRequest: (req: CapturedRequest) => void
  clear: () => void
  select: (id: string | null) => void
  togglePaused: () => void
  toggleMask: () => void
  togglePlaceholderMode: () => void
  setFilter: (patch: Partial<FilterState>) => void
  setResBody: (id: string, entry: ResBodyEntry) => void
  setDiffBase: (id: string | null) => void
  setDiffCompare: (id: string | null) => void
  clearDiff: () => void
  hydrate: () => Promise<void>
  importEntries: (
    reqs: CapturedRequest[],
    bodies: Record<string, ResBodyEntry>,
  ) => void
  prefetchBodies: () => void
}

export const useInspectorStore = create<InspectorState>((set, get) => ({
  requests: [],
  selectedId: null,
  paused: false,
  maskEnabled: true,
  placeholderMode: false,
  maskKeys: DEFAULT_MASK_KEYS,
  maxEntries: 1000,
  filter: EMPTY_FILTER,
  resBodies: {},
  diffBaseId: null,
  diffCompareId: null,
  hydrated: false,

  addRequest: (req) => {
    void persistRequest(req)
    set((state) => {
      const next = [...state.requests, req]
      if (next.length > state.maxEntries) {
        const overflow = next.length - state.maxEntries
        const dropped = next.slice(0, overflow)
        for (const d of dropped) {
          removeRaw(d.id)
          void deleteRequest(d.id)
        }
        return { requests: next.slice(overflow) }
      }
      return { requests: next }
    })
  },

  clear: () => {
    clearRaw()
    void clearAll()
    set({
      requests: [],
      selectedId: null,
      resBodies: {},
      diffBaseId: null,
      diffCompareId: null,
    })
  },

  select: (id) => set({ selectedId: id }),
  togglePaused: () => set((state) => ({ paused: !state.paused })),
  toggleMask: () => set((state) => ({ maskEnabled: !state.maskEnabled })),
  togglePlaceholderMode: () =>
    set((state) => ({ placeholderMode: !state.placeholderMode })),
  setFilter: (patch) =>
    set((state) => ({ filter: { ...state.filter, ...patch } })),

  setResBody: (id, entry) => {
    if (entry.state === 'loaded' || entry.state === 'truncated') {
      void persistResBody(id, entry)
    }
    set((state) => ({ resBodies: { ...state.resBodies, [id]: entry } }))
  },

  setDiffBase: (id) => set({ diffBaseId: id }),
  setDiffCompare: (id) => set({ diffCompareId: id }),
  clearDiff: () => set({ diffCompareId: null }),

  hydrate: async () => {
    if (get().hydrated) return
    const { requests, resBodies } = await loadAll()
    set((state) => ({
      hydrated: true,
      requests: state.requests.length ? state.requests : requests,
      resBodies: Object.keys(state.resBodies).length ? state.resBodies : resBodies,
    }))
  },

  importEntries: (reqs, bodies) => {
    for (const r of reqs) void persistRequest(r)
    for (const [id, entry] of Object.entries(bodies)) {
      if (entry.state === 'loaded' || entry.state === 'truncated') {
        void persistResBody(id, entry)
      }
    }
    set((state) => {
      let merged = [...state.requests, ...reqs]
      if (merged.length > state.maxEntries) {
        const overflow = merged.length - state.maxEntries
        const dropped = merged.slice(0, overflow)
        for (const d of dropped) {
          removeRaw(d.id)
          void deleteRequest(d.id)
        }
        merged = merged.slice(overflow)
      }
      return { requests: merged, resBodies: { ...state.resBodies, ...bodies } }
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
