import { describe, it, expect } from 'vitest'
import { toPostman } from '../src/core/convert/toPostman'
import { parsePostman } from '../src/core/postman'
import { buildHar } from '../src/core/har'
import { parseImport } from '../src/core/session'
import { parseHar } from '../src/core/har'
import { DEFAULT_MASK_KEYS } from '../src/core/mask'
import { makeRequest } from './fixtures'

const noMask = { mask: false, maskKeys: DEFAULT_MASK_KEYS }

describe('Postman export -> import round-trip', () => {
  it('re-imports method, url, and json body', () => {
    const reqs = [
      makeRequest({
        method: 'POST',
        url: 'https://api.example.com/v1/login?next=/home',
        reqBody: { kind: 'json', raw: '{"u":"a"}' },
        reqHeaders: { 'Content-Type': 'application/json' },
      }),
    ]
    const json = toPostman(reqs, noMask)
    const out = parsePostman(JSON.parse(json), 0)
    expect(out).toHaveLength(1)
    expect(out[0].method).toBe('POST')
    expect(out[0].url).toBe('https://api.example.com/v1/login?next=/home')
    expect(out[0].reqBody.kind).toBe('json')
    expect(out[0].query).toEqual([['next', '/home']])
  })

  it('is recognized by parseImport', () => {
    const json = toPostman([makeRequest()], noMask)
    const out = parseImport(json, 0)
    expect(out.requests).toHaveLength(1)
  })
})

describe('HAR export -> import round-trip', () => {
  it('re-imports requests and response bodies', () => {
    const reqs = [
      makeRequest({
        id: 'x',
        method: 'GET',
        url: 'https://api.example.com/v1/users?page=2',
      }),
    ]
    const bodies = { x: { state: 'loaded' as const, body: '{"ok":1}' } }
    const har = buildHar(reqs, bodies)

    const out = parseHar(har, 0)
    expect(out.requests).toHaveLength(1)
    expect(out.requests[0].method).toBe('GET')
    expect(out.requests[0].path).toBe('/v1/users?page=2')
    const id = out.requests[0].id
    expect(out.resBodies[id].body).toBe('{"ok":1}')
  })

  it('is recognized by parseImport', () => {
    const har = buildHar([makeRequest({ id: 'y' })], {})
    const out = parseImport(har, 0)
    expect(out.requests).toHaveLength(1)
  })

  it('redacts sensitive data when exported in safe mode', () => {
    const reqs = [
      makeRequest({
        id: 'z',
        method: 'POST',
        url: 'https://api.example.com/v1/login?token=abc123',
        reqHeaders: {
          Authorization: 'Bearer supersecrettoken123',
          'Content-Type': 'application/json',
        },
        reqBody: { kind: 'json', raw: '{"card":"4242424242424242"}' },
      }),
    ]
    const safe = { mask: true, maskKeys: DEFAULT_MASK_KEYS, placeholders: true }
    const har = buildHar(reqs, {}, safe)
    expect(har).not.toContain('supersecrettoken123')
    expect(har).not.toContain('4242424242424242')
    expect(har).toContain('***MASKED***')
    expect(har).toContain('Bearer ***MASKED***')
    expect(har).toContain('application/json')

    const raw = buildHar(reqs, {})
    expect(raw).toContain('supersecrettoken123')
  })
})
