import { describe, it, expect } from 'vitest'
import { applyVars, extractVars } from '../src/core/vars'
import { headersToLines, parseHeaderLines } from '../src/core/headers'

describe('applyVars', () => {
  it('substitutes known variables', () => {
    expect(applyVars('Bearer {{token}}', { token: 'abc' })).toBe('Bearer abc')
    expect(applyVars('{{ base }}/users', { base: 'https://x' })).toBe(
      'https://x/users',
    )
  })
  it('leaves unknown variables untouched', () => {
    expect(applyVars('{{missing}}', {})).toBe('{{missing}}')
  })
})

describe('extractVars', () => {
  it('lists unique variable names', () => {
    expect(extractVars('{{a}}/{{b}}/{{a}}')).toEqual(['a', 'b'])
  })
})

describe('header line parsing', () => {
  it('round-trips a header record', () => {
    const rec = { 'Content-Type': 'application/json', Authorization: 'Bearer x' }
    expect(parseHeaderLines(headersToLines(rec))).toEqual(rec)
  })
  it('ignores blank and malformed lines', () => {
    expect(parseHeaderLines('A: 1\n\nnocolon\nB: 2')).toEqual({ A: '1', B: '2' })
  })
  it('keeps colons in the value', () => {
    expect(parseHeaderLines('X: a:b:c')).toEqual({ X: 'a:b:c' })
  })
})
