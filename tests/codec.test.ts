import { describe, it, expect } from 'vitest'
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
} from '../src/core/codec'

describe('base64', () => {
  it('round-trips unicode', () => {
    expect(b64decode(b64encode('héllo 한글'))).toBe('héllo 한글')
  })
  it('decodes base64url', () => {
    const jwtPayload = b64encode('{"a":1}').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(b64urlDecode(jwtPayload)).toBe('{"a":1}')
  })
  it('base64url enc/dec round-trip without padding', () => {
    const enc = b64urlEncode('{"role":"admin"}')
    expect(enc).not.toContain('=')
    expect(b64urlDecode(enc)).toBe('{"role":"admin"}')
  })
})

describe('url / hex', () => {
  it('url round-trip', () => {
    expect(urlDecode(urlEncode('a b&c=d'))).toBe('a b&c=d')
  })
  it('hex round-trip', () => {
    expect(hexDecode(hexEncode('abc'))).toBe('abc')
    expect(hexEncode('A')).toBe('41')
  })
})

describe('decodeJwt', () => {
  it('decodes header and payload', () => {
    const token =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWxpY2UifQ.sig'
    const out = decodeJwt(token)
    expect(out.valid).toBe(true)
    expect(out.payload).toEqual({ sub: '123', name: 'Alice' })
  })
  it('flags invalid tokens', () => {
    expect(decodeJwt('nope').valid).toBe(false)
  })
})

describe('md5', () => {
  it('matches known vectors', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(md5('The quick brown fox jumps over the lazy dog')).toBe(
      '9e107d9d372bb6826bd81d3542a419d6',
    )
  })
})

describe('sha', () => {
  it('computes sha-256', async () => {
    expect(await sha('abc', 'SHA-256')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})
