export const UPDATE_REPO = 'monkshark/apiscope'
export const UPDATE_STORAGE_KEY = 'update:info'

const RELEASES_API = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`
const RELEASES_PAGE = `https://github.com/${UPDATE_REPO}/releases`

export interface UpdateInfo {
  available: boolean
  latestVersion: string
  url: string
  checkedAt: number
}

interface GithubRelease {
  tag_name?: string
  html_url?: string
  draft?: boolean
  prerelease?: boolean
}

export function parseVersion(tag: string): number[] {
  return tag
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)
}

export function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

export async function fetchLatestRelease(
  fetchFn: typeof fetch = fetch,
): Promise<{ version: string; url: string } | null> {
  const res = await fetchFn(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as GithubRelease
  if (!data.tag_name || data.draft || data.prerelease) return null
  return {
    version: data.tag_name.replace(/^v/i, ''),
    url: data.html_url ?? RELEASES_PAGE,
  }
}

export function computeUpdate(
  current: string,
  latest: { version: string; url: string } | null,
  checkedAt: number,
): UpdateInfo | null {
  if (!latest) return null
  return {
    available: isNewer(latest.version, current),
    latestVersion: latest.version,
    url: latest.url,
    checkedAt,
  }
}
