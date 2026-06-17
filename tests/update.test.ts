import { describe, it, expect, vi } from 'vitest'
import {
  parseVersion,
  isNewer,
  fetchLatestRelease,
  computeUpdate,
} from '../src/core/update'

describe('parseVersion', () => {
  it('strips a leading v and splits into numbers', () => {
    expect(parseVersion('v1.2.0')).toEqual([1, 2, 0])
    expect(parseVersion('1.10.3')).toEqual([1, 10, 3])
  })
  it('treats missing or junk segments as 0', () => {
    expect(parseVersion('v2')).toEqual([2])
    expect(parseVersion('1.x.4')).toEqual([1, 0, 4])
  })
})

describe('isNewer', () => {
  it('detects a higher version', () => {
    expect(isNewer('1.2.0', '1.1.0')).toBe(true)
    expect(isNewer('v1.2.0', '1.1.9')).toBe(true)
    expect(isNewer('1.10.0', '1.9.0')).toBe(true)
  })
  it('returns false for equal or older', () => {
    expect(isNewer('1.1.0', '1.1.0')).toBe(false)
    expect(isNewer('1.0.0', '1.1.0')).toBe(false)
  })
  it('compares differing segment counts', () => {
    expect(isNewer('1.1.1', '1.1')).toBe(true)
    expect(isNewer('1.1', '1.1.1')).toBe(false)
  })
})

describe('fetchLatestRelease', () => {
  const ok = (data: unknown) =>
    ({ ok: true, json: async () => data }) as Response

  it('returns the version without the v prefix and the release url', async () => {
    const fetchFn = vi.fn(async () =>
      ok({ tag_name: 'v1.3.0', html_url: 'https://example.com/r/1.3.0' }),
    ) as unknown as typeof fetch
    expect(await fetchLatestRelease(fetchFn)).toEqual({
      version: '1.3.0',
      url: 'https://example.com/r/1.3.0',
    })
  })
  it('ignores drafts and prereleases', async () => {
    const fetchFn = vi.fn(async () =>
      ok({ tag_name: 'v2.0.0', prerelease: true }),
    ) as unknown as typeof fetch
    expect(await fetchLatestRelease(fetchFn)).toBeNull()
  })
  it('returns null on a non-ok response', async () => {
    const fetchFn = vi.fn(async () => ({ ok: false }) as Response) as unknown as typeof fetch
    expect(await fetchLatestRelease(fetchFn)).toBeNull()
  })
})

describe('computeUpdate', () => {
  it('flags availability against the current version', () => {
    expect(
      computeUpdate('1.1.0', { version: '1.2.0', url: 'u' }, 5),
    ).toEqual({ available: true, latestVersion: '1.2.0', url: 'u', checkedAt: 5 })
    expect(
      computeUpdate('1.2.0', { version: '1.2.0', url: 'u' }, 5),
    ).toEqual({ available: false, latestVersion: '1.2.0', url: 'u', checkedAt: 5 })
  })
  it('returns null when no release was found', () => {
    expect(computeUpdate('1.1.0', null, 5)).toBeNull()
  })
})
