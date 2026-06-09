import { describe, it, expect } from 'vitest'
import { toCurl } from '../src/core/convert/toCurl'
import { toHttpie } from '../src/core/convert/toHttpie'
import { DEFAULT_MASK_KEYS } from '../src/core/mask'
import { makeRequest } from './fixtures'

const opts = { mask: false, maskKeys: DEFAULT_MASK_KEYS }

describe('toCurl', () => {
  it('omits -X for GET', () => {
    const out = toCurl(makeRequest(), opts)
    expect(out).toContain("curl 'https://api.example.com/v1/users?page=2'")
    expect(out).not.toContain('-X GET')
  })

  it('adds -X for POST and includes headers', () => {
    const out = toCurl(
      makeRequest({ method: 'POST', reqHeaders: { 'Content-Type': 'application/json' } }),
      opts,
    )
    expect(out).toContain('-X POST')
    expect(out).toContain("-H 'Content-Type: application/json'")
  })

  it('emits --data-raw for json body', () => {
    const out = toCurl(
      makeRequest({ method: 'POST', reqBody: { kind: 'json', raw: '{"a":1}' } }),
      opts,
    )
    expect(out).toContain(`--data-raw '{"a":1}'`)
  })

  it('emits --data-urlencode per form pair', () => {
    const out = toCurl(
      makeRequest({
        method: 'POST',
        reqBody: { kind: 'form', pairs: [['a', '1'], ['b', '2']] },
      }),
      opts,
    )
    expect(out).toContain("--data-urlencode 'a=1'")
    expect(out).toContain("--data-urlencode 'b=2'")
  })

  it('emits -F for multipart with files', () => {
    const out = toCurl(
      makeRequest({
        method: 'POST',
        reqBody: {
          kind: 'multipart',
          parts: [{ name: 'file', filename: 'a.png' }, { name: 'note' }],
        },
      }),
      opts,
    )
    expect(out).toContain("-F 'file=@a.png'")
    expect(out).toContain("-F 'note='")
  })

  it('escapes single quotes in header values', () => {
    const out = toCurl(
      makeRequest({ reqHeaders: { 'X-Note': "it's fine" } }),
      opts,
    )
    expect(out).toContain(`-H 'X-Note: it'\\''s fine'`)
  })

  it('masks sensitive headers when enabled', () => {
    const out = toCurl(
      makeRequest({ reqHeaders: { Authorization: 'Bearer supersecret' } }),
      { mask: true, maskKeys: DEFAULT_MASK_KEYS },
    )
    expect(out).toContain("-H 'Authorization: Bearer ***MASKED***'")
    expect(out).not.toContain('supersecret')
  })

  it('uses ^ continuation in windows mode', () => {
    const out = toCurl(
      makeRequest({ method: 'POST', reqHeaders: { A: 'b' } }),
      { ...opts, windows: true },
    )
    expect(out).toContain(' ^\n')
  })
})

describe('toCurl placeholder mode', () => {
  const ph = { mask: true, maskKeys: DEFAULT_MASK_KEYS, placeholders: true }

  it('emits $AUTH_TOKEN for Authorization and double-quotes that header', () => {
    const out = toCurl(
      makeRequest({ reqHeaders: { Authorization: 'Bearer realtoken' } }),
      ph,
    )
    expect(out).toContain('-H "Authorization: Bearer $AUTH_TOKEN"')
    expect(out).not.toContain('realtoken')
  })

  it('emits $COOKIE for Cookie header', () => {
    const out = toCurl(makeRequest({ reqHeaders: { Cookie: 'sid=abc' } }), ph)
    expect(out).toContain('-H "Cookie: $COOKIE"')
  })

  it('keeps non-sensitive headers single-quoted', () => {
    const out = toCurl(
      makeRequest({ reqHeaders: { 'Content-Type': 'application/json' } }),
      ph,
    )
    expect(out).toContain("-H 'Content-Type: application/json'")
  })

  it('uses a placeholder for sensitive query params and double-quotes the url', () => {
    const out = toCurl(
      makeRequest({ url: 'https://api.example.com/x?token=secret&q=1' }),
      ph,
    )
    expect(out).toContain('$TOKEN')
    expect(out).not.toContain('secret')
    expect(out).toContain('curl "https://api.example.com/x?')
  })
})

describe('toHttpie', () => {
  it('builds method url and header tokens', () => {
    const out = toHttpie(
      makeRequest({ method: 'POST', reqHeaders: { 'Content-Type': 'application/json' } }),
      opts,
    )
    expect(out).toContain('http POST')
    expect(out).toContain("'Content-Type:application/json'")
  })

  it('uses --raw for json body', () => {
    const out = toHttpie(
      makeRequest({ method: 'POST', reqBody: { kind: 'json', raw: '{"a":1}' } }),
      opts,
    )
    expect(out).toContain(`--raw '{"a":1}'`)
  })

  it('emits key=value tokens for form body', () => {
    const out = toHttpie(
      makeRequest({ method: 'POST', reqBody: { kind: 'form', pairs: [['a', '1']] } }),
      opts,
    )
    expect(out).toContain("'a=1'")
  })
})
