import type { CapturedRequest } from '../../types'
import {
  maskHeaderValueStyled,
  maskQueryValueStyled,
  maskUrlStyled,
  maskText,
  type MaskStyle,
} from '../mask'
import type { ConvertOptions } from './shell'

interface PostmanUrl {
  raw: string
  protocol?: string
  host?: string[]
  path?: string[]
  query?: { key: string; value: string }[]
}

function buildUrl(req: CapturedRequest, opts: ConvertOptions, style: MaskStyle): PostmanUrl {
  const raw = opts.mask ? maskUrlStyled(req.url, style).url : req.url
  try {
    const u = new URL(req.url)
    return {
      raw,
      protocol: u.protocol.replace(':', ''),
      host: u.hostname.split('.'),
      path: u.pathname.split('/').filter(Boolean),
      query: [...u.searchParams.entries()].map(([key, value]) => ({
        key,
        value: opts.mask ? maskQueryValueStyled(key, value, style) : value,
      })),
    }
  } catch {
    return { raw }
  }
}

function buildBody(req: CapturedRequest, mask: boolean): unknown {
  const b = req.reqBody
  if (b.kind === 'json')
    return {
      mode: 'raw',
      raw: maskText(b.raw, mask),
      options: { raw: { language: 'json' } },
    }
  if (b.kind === 'text')
    return {
      mode: 'raw',
      raw: maskText(b.raw, mask),
      options: { raw: { language: 'text' } },
    }
  if (b.kind === 'form')
    return {
      mode: 'urlencoded',
      urlencoded: b.pairs.map(([key, value]) => ({
        key,
        value: maskText(value, mask),
      })),
    }
  if (b.kind === 'multipart')
    return {
      mode: 'formdata',
      formdata: b.parts.map((p) =>
        p.filename
          ? { key: p.name, type: 'file', src: p.filename }
          : { key: p.name, type: 'text', value: '' },
      ),
    }
  return null
}

export function toPostman(
  reqs: CapturedRequest[],
  opts: ConvertOptions & { name?: string },
): string {
  const style: MaskStyle = opts.placeholders ? 'placeholder-postman' : 'redact'

  const item = reqs.map((req) => {
    const header = Object.entries(req.reqHeaders).map(([key, raw]) => ({
      key,
      value: opts.mask ? maskHeaderValueStyled(key, raw, opts.maskKeys, style) : raw,
    }))
    const body = buildBody(req, opts.mask)
    return {
      name: `${req.method.toUpperCase()} ${req.path}`,
      request: {
        method: req.method.toUpperCase(),
        header,
        url: buildUrl(req, opts, style),
        ...(body ? { body } : {}),
      },
    }
  })

  return JSON.stringify(
    {
      info: {
        name: opts.name ?? 'API Inspector Export',
        schema:
          'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item,
    },
    null,
    2,
  )
}
