import { describe, it, expect } from 'vitest'
import {
  maskValue,
  maskHeaders,
  maskUrl,
  maskText,
  maskDeep,
  isSensitiveHeader,
  isCookieHeader,
  parseCookieParts,
  hasSensitive,
  DEFAULT_MASK_KEYS,
} from '../src/core/mask'

describe('parseCookieParts', () => {
  it('splits pairs and keeps names and values', () => {
    expect(parseCookieParts('ajs_anonymous_id=abc123; sessionid=xyz')).toEqual([
      { name: 'ajs_anonymous_id', value: 'abc123', hasValue: true },
      { name: 'sessionid', value: 'xyz', hasValue: true },
    ])
  })
  it('keeps the full value when it contains "="', () => {
    expect(parseCookieParts('token=a=b==')).toEqual([
      { name: 'token', value: 'a=b==', hasValue: true },
    ])
  })
  it('marks valueless attributes', () => {
    expect(parseCookieParts('id=abc; HttpOnly; Secure')).toEqual([
      { name: 'id', value: 'abc', hasValue: true },
      { name: 'HttpOnly', value: '', hasValue: false },
      { name: 'Secure', value: '', hasValue: false },
    ])
  })
  it('detects cookie headers case-insensitively', () => {
    expect(isCookieHeader('Cookie')).toBe(true)
    expect(isCookieHeader('set-cookie')).toBe(true)
    expect(isCookieHeader('authorization')).toBe(false)
  })
})

describe('isSensitiveHeader', () => {
  it('matches default keys case-insensitively', () => {
    expect(isSensitiveHeader('Authorization', DEFAULT_MASK_KEYS)).toBe(true)
    expect(isSensitiveHeader('cookie', DEFAULT_MASK_KEYS)).toBe(true)
  })
  it('matches suffix patterns', () => {
    expect(isSensitiveHeader('x-csrf-token', DEFAULT_MASK_KEYS)).toBe(true)
    expect(isSensitiveHeader('client-secret', DEFAULT_MASK_KEYS)).toBe(true)
    expect(isSensitiveHeader('private-key', DEFAULT_MASK_KEYS)).toBe(true)
  })
  it('ignores normal headers', () => {
    expect(isSensitiveHeader('content-type', DEFAULT_MASK_KEYS)).toBe(false)
    expect(isSensitiveHeader('accept', DEFAULT_MASK_KEYS)).toBe(false)
  })
})

describe('maskValue', () => {
  it('masks bearer tokens but keeps scheme', () => {
    expect(maskValue('Bearer abc.def.ghi')).toBe('Bearer ***MASKED***')
    expect(maskValue('basic dXNlcjpwYXNz')).toBe('basic ***MASKED***')
  })
  it('fully masks short values', () => {
    expect(maskValue('abc')).toBe('***MASKED***')
  })
  it('keeps a 4-char hint for long values', () => {
    expect(maskValue('abcdefghijklmnop')).toBe('abcd…***MASKED***')
  })
})

describe('maskHeaders', () => {
  it('passes through when disabled', () => {
    const h = { Authorization: 'Bearer x' }
    expect(maskHeaders(h, { enabled: false, maskKeys: DEFAULT_MASK_KEYS })).toBe(h)
  })
  it('masks only sensitive headers', () => {
    const out = maskHeaders(
      { Authorization: 'Bearer secrettoken', 'Content-Type': 'application/json' },
      { enabled: true, maskKeys: DEFAULT_MASK_KEYS },
    )
    expect(out['Authorization']).toBe('Bearer ***MASKED***')
    expect(out['Content-Type']).toBe('application/json')
  })
})

describe('maskUrl', () => {
  it('masks sensitive query keys', () => {
    expect(maskUrl('https://a.com/x?token=abc&q=1', true)).toBe(
      'https://a.com/x?token=***MASKED***&q=1',
    )
  })
  it('returns original when nothing sensitive', () => {
    expect(maskUrl('https://a.com/x?q=1', true)).toBe('https://a.com/x?q=1')
  })
  it('passes through when disabled', () => {
    expect(maskUrl('https://a.com/x?token=abc', false)).toBe(
      'https://a.com/x?token=abc',
    )
  })
})

describe('hasSensitive', () => {
  it('detects presence of sensitive headers', () => {
    expect(hasSensitive({ cookie: 'a=b' }, DEFAULT_MASK_KEYS)).toBe(true)
    expect(hasSensitive({ accept: '*/*' }, DEFAULT_MASK_KEYS)).toBe(false)
  })
})

describe('maskText', () => {
  it('masks a Luhn-valid credit card keeping the last 4', () => {
    expect(maskText('card 4242 4242 4242 4242 ok', true)).toBe(
      'card **** **** **** 4242 ok',
    )
    expect(maskText('4111111111111111', true)).toBe('**** **** **** 1111')
  })

  it('leaves non-card digit sequences alone', () => {
    expect(maskText('order 1234567890123 done', true)).toBe(
      'order 1234567890123 done',
    )
  })

  it('masks emails but keeps first char and domain', () => {
    expect(maskText('to john.doe@example.com now', true)).toBe(
      'to j***@example.com now',
    )
  })

  it('masks JWTs', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-123_XYZ'
    expect(maskText(`token=${jwt}`, true)).toBe('token=***JWT***')
  })

  it('masks bearer tokens inside text', () => {
    expect(maskText('auth Bearer abc.def-ghi end', true)).toBe(
      'auth Bearer ***MASKED*** end',
    )
  })

  it('masks Korean RRN keeping the birth date', () => {
    expect(maskText('rrn 900101-1234567', true)).toBe('rrn 900101-*******')
  })

  it('passes through when disabled', () => {
    expect(maskText('4242 4242 4242 4242', false)).toBe('4242 4242 4242 4242')
  })
})

describe('maskDeep', () => {
  it('masks sensitive data inside nested objects and arrays', () => {
    const input = {
      user: { email: 'a@b.com', card: '4242424242424242' },
      tags: ['x@y.com', 'plain'],
    }
    const out = maskDeep(input, true) as typeof input
    expect(out.user.email).toBe('a***@b.com')
    expect(out.user.card).toBe('**** **** **** 4242')
    expect(out.tags[0]).toBe('x***@y.com')
    expect(out.tags[1]).toBe('plain')
  })

  it('returns the value untouched when disabled', () => {
    const input = { email: 'a@b.com' }
    expect(maskDeep(input, false)).toBe(input)
  })
})

describe('maskHeaders body-pattern masking', () => {
  it('masks sensitive data inside non-sensitive header values', () => {
    const out = maskHeaders(
      { 'X-Note': 'card 4242 4242 4242 4242' },
      { enabled: true, maskKeys: DEFAULT_MASK_KEYS },
    )
    expect(out['X-Note']).toBe('card **** **** **** 4242')
  })
})
