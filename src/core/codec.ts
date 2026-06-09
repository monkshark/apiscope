function bytesToBin(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return s
}

export function b64encode(input: string): string {
  return btoa(bytesToBin(new TextEncoder().encode(input)))
}

export function b64decode(input: string): string {
  const bin = atob(input.trim())
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function b64urlDecode(input: string): string {
  let s = input.trim().replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return b64decode(s)
}

export function b64urlEncode(input: string): string {
  return b64encode(input).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function urlEncode(input: string): string {
  return encodeURIComponent(input)
}

export function urlDecode(input: string): string {
  return decodeURIComponent(input.trim().replace(/\+/g, ' '))
}

export function hexEncode(input: string): string {
  return [...new TextEncoder().encode(input)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hexDecode(input: string): string {
  const clean = input.trim().replace(/\s+/g, '')
  const bytes = new Uint8Array(Math.floor(clean.length / 2))
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return new TextDecoder().decode(bytes)
}

export interface JwtParts {
  header: unknown
  payload: unknown
  valid: boolean
}

export function decodeJwt(token: string): JwtParts {
  const parts = token.trim().split('.')
  if (parts.length < 2) return { header: null, payload: null, valid: false }
  try {
    return {
      header: JSON.parse(b64urlDecode(parts[0])),
      payload: JSON.parse(b64urlDecode(parts[1])),
      valid: true,
    }
  } catch {
    return { header: null, payload: null, valid: false }
  }
}

function md5bytes(msg: Uint8Array): string {
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
    9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
    16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
    15, 21,
  ]
  const K: number[] = []
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)
  }
  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  const ml = msg.length
  const bitLen = ml * 8
  const total = (Math.floor((ml + 8) / 64) + 1) * 64
  const bytes = new Uint8Array(total)
  bytes.set(msg)
  bytes[ml] = 0x80
  for (let i = 0; i < 4; i++) bytes[total - 8 + i] = (bitLen >>> (8 * i)) & 0xff

  const rotl = (x: number, c: number) => (x << c) | (x >>> (32 - c))

  for (let off = 0; off < total; off += 64) {
    const M: number[] = []
    for (let j = 0; j < 16; j++) {
      M[j] =
        bytes[off + j * 4] |
        (bytes[off + j * 4 + 1] << 8) |
        (bytes[off + j * 4 + 2] << 16) |
        (bytes[off + j * 4 + 3] << 24)
    }
    let A = a0
    let B = b0
    let C = c0
    let D = d0
    for (let i = 0; i < 64; i++) {
      let F: number
      let g: number
      if (i < 16) {
        F = (B & C) | (~B & D)
        g = i
      } else if (i < 32) {
        F = (D & B) | (~D & C)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        F = B ^ C ^ D
        g = (3 * i + 5) % 16
      } else {
        F = C ^ (B | ~D)
        g = (7 * i) % 16
      }
      F = (F + A + K[i] + M[g]) | 0
      A = D
      D = C
      C = B
      B = (B + rotl(F, s[i])) | 0
    }
    a0 = (a0 + A) | 0
    b0 = (b0 + B) | 0
    c0 = (c0 + C) | 0
    d0 = (d0 + D) | 0
  }

  const toHex = (n: number) => {
    let h = ''
    for (let i = 0; i < 4; i++) h += ((n >>> (8 * i)) & 0xff).toString(16).padStart(2, '0')
    return h
  }
  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0)
}

export function md5(input: string): string {
  return md5bytes(new TextEncoder().encode(input))
}

export async function sha(
  input: string,
  algo: 'SHA-1' | 'SHA-256' | 'SHA-512',
): Promise<string> {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(input))
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
