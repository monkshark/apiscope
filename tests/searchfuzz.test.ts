import { describe, it, expect } from 'vitest'
import { findMatches, highlightSegments } from '../src/core/search'
import {
  applyPayload,
  hasMarker,
  parsePayloads,
  expandLine,
  FUZZ_MARKER,
} from '../src/core/fuzz'

describe('findMatches', () => {
  it('finds flag patterns', () => {
    const m = findMatches('x flag{abc} y flag{def}', 'flag\\{[^}]*\\}')
    expect(m.map((x) => x.text)).toEqual(['flag{abc}', 'flag{def}'])
  })
  it('falls back to literal on bad regex', () => {
    expect(findMatches('a(b', '(').map((x) => x.text)).toEqual(['('])
  })
})

describe('highlightSegments', () => {
  it('splits text into match / non-match parts', () => {
    const segs = highlightSegments('aXbXc', 'X')
    expect(segs).toEqual([
      { text: 'a', match: false },
      { text: 'X', match: true },
      { text: 'b', match: false },
      { text: 'X', match: true },
      { text: 'c', match: false },
    ])
  })
})

describe('fuzz', () => {
  it('detects the marker', () => {
    expect(hasMarker('id=' + FUZZ_MARKER)).toBe(true)
    expect(hasMarker('id=1')).toBe(false)
  })
  it('substitutes the payload at the marker', () => {
    expect(applyPayload('a=' + FUZZ_MARKER + '&b=2', '99')).toBe('a=99&b=2')
  })
  it('replaces every marker occurrence', () => {
    expect(applyPayload('a=' + FUZZ_MARKER + '&c=' + FUZZ_MARKER, 'x')).toBe(
      'a=x&c=x',
    )
  })
  it('parses payload lines', () => {
    expect(parsePayloads('a\nb\n\nc\n')).toEqual(['a', 'b', 'c'])
  })
})

describe('payload ranges', () => {
  it('expands ascending range', () => {
    expect(expandLine('1..5')).toEqual(['1', '2', '3', '4', '5'])
  })
  it('supports a step', () => {
    expect(expandLine('0..10..5')).toEqual(['0', '5', '10'])
  })
  it('supports descending', () => {
    expect(expandLine('3..1')).toEqual(['3', '2', '1'])
  })
  it('keeps zero padding', () => {
    expect(expandLine('08..11')).toEqual(['08', '09', '10', '11'])
  })
  it('leaves non-range lines literal', () => {
    expect(expandLine('admin')).toEqual(['admin'])
  })
  it('mixes ranges and literals in parsePayloads', () => {
    expect(parsePayloads('admin\n1..3')).toEqual(['admin', '1', '2', '3'])
  })
})
