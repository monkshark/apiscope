import { describe, it, expect } from 'vitest'
import { toPostman } from '../src/core/convert/toPostman'
import { DEFAULT_MASK_KEYS } from '../src/core/mask'
import { makeRequest } from './fixtures'

const opts = { mask: false, maskKeys: DEFAULT_MASK_KEYS }

function parse(json: string) {
  return JSON.parse(json) as {
    info: { name: string; schema: string }
    item: {
      name: string
      request: {
        method: string
        header: { key: string; value: string }[]
        url: { raw: string; host?: string[]; path?: string[]; query?: { key: string; value: string }[] }
        body?: { mode: string; raw?: string; urlencoded?: unknown[]; formdata?: unknown[] }
      }
    }[]
  }
}

describe('toPostman', () => {
  it('produces a v2.1 collection with one item per request', () => {
    const col = parse(toPostman([makeRequest(), makeRequest()], opts))
    expect(col.info.schema).toContain('v2.1.0')
    expect(col.item).toHaveLength(2)
  })

  it('builds a structured url with host/path/query', () => {
    const col = parse(toPostman([makeRequest()], opts))
    const url = col.item[0].request.url
    expect(url.host).toEqual(['api', 'example', 'com'])
    expect(url.path).toEqual(['v1', 'users'])
    expect(url.query).toEqual([{ key: 'page', value: '2' }])
  })

  it('emits raw json body', () => {
    const col = parse(
      toPostman(
        [makeRequest({ method: 'POST', reqBody: { kind: 'json', raw: '{"a":1}' } })],
        opts,
      ),
    )
    expect(col.item[0].request.body?.mode).toBe('raw')
    expect(col.item[0].request.body?.raw).toBe('{"a":1}')
  })

  it('emits urlencoded body for form', () => {
    const col = parse(
      toPostman(
        [makeRequest({ method: 'POST', reqBody: { kind: 'form', pairs: [['a', '1']] } })],
        opts,
      ),
    )
    expect(col.item[0].request.body?.mode).toBe('urlencoded')
  })

  it('masks query and headers when enabled', () => {
    const col = parse(
      toPostman(
        [
          makeRequest({
            url: 'https://api.example.com/v1/x?token=abc',
            reqHeaders: { Authorization: 'Bearer secrettoken' },
          }),
        ],
        { mask: true, maskKeys: DEFAULT_MASK_KEYS },
      ),
    )
    expect(col.item[0].request.url.query).toEqual([
      { key: 'token', value: '***MASKED***' },
    ])
    expect(col.item[0].request.header[0].value).toBe('Bearer ***MASKED***')
  })

  it('uses {{VAR}} placeholders when placeholders enabled', () => {
    const col = parse(
      toPostman(
        [
          makeRequest({
            url: 'https://api.example.com/v1/x?token=abc',
            reqHeaders: { Authorization: 'Bearer secrettoken' },
          }),
        ],
        { mask: true, maskKeys: DEFAULT_MASK_KEYS, placeholders: true },
      ),
    )
    expect(col.item[0].request.header[0].value).toBe('Bearer {{AUTH_TOKEN}}')
    expect(col.item[0].request.url.query).toEqual([
      { key: 'token', value: '{{TOKEN}}' },
    ])
  })
})
