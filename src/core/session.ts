import type { CapturedRequest, ResBodyEntry } from '../types'
import { parseHar, type ParsedHar } from './har'
import { isPostmanCollection, parsePostman } from './postman'

export const SESSION_FORMAT = 'apiscope'
const LEGACY_SESSION_FORMAT = 'api-inspector'

export interface SessionBundle {
  format: string
  version: number
  requests: CapturedRequest[]
  resBodies: Record<string, ResBodyEntry>
}

export function buildSession(
  requests: CapturedRequest[],
  resBodies: Record<string, ResBodyEntry>,
): string {
  const bundle: SessionBundle = {
    format: SESSION_FORMAT,
    version: 1,
    requests,
    resBodies,
  }
  return JSON.stringify(bundle, null, 2)
}

function isSessionBundle(data: unknown): data is SessionBundle {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    (d.format === SESSION_FORMAT || d.format === LEGACY_SESSION_FORMAT) &&
    Array.isArray(d.requests)
  )
}

export function parseImport(jsonText: string, now: number): ParsedHar {
  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error('Not valid JSON.')
  }
  if (isSessionBundle(data)) {
    return { requests: data.requests, resBodies: data.resBodies ?? {} }
  }
  if (isPostmanCollection(data)) {
    return { requests: parsePostman(data, now), resBodies: {} }
  }
  return parseHar(jsonText, now)
}
