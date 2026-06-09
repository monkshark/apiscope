import type { CapturedRequest } from '../../types'
import { maskHeaderValueStyled, maskUrlStyled, maskText, type MaskStyle } from '../mask'
import { singleQuote, doubleQuoteKeepVars, type ConvertOptions } from './shell'

export function toHttpie(req: CapturedRequest, opts: ConvertOptions): string {
  const style: MaskStyle = opts.placeholders ? 'placeholder-env' : 'redact'
  const parts: string[] = ['http', req.method.toUpperCase()]

  if (!opts.mask) {
    parts.push(singleQuote(req.url))
  } else {
    const { url, hasPlaceholder } = maskUrlStyled(req.url, style)
    parts.push(hasPlaceholder ? doubleQuoteKeepVars(url) : singleQuote(url))
  }

  for (const [key, raw] of Object.entries(req.reqHeaders)) {
    if (!opts.mask) {
      parts.push(singleQuote(`${key}:${raw}`))
      continue
    }
    const value = maskHeaderValueStyled(key, raw, opts.maskKeys, style)
    const seg = `${key}:${value}`
    const useVarQuote = opts.placeholders && value.includes('$')
    parts.push(useVarQuote ? doubleQuoteKeepVars(seg) : singleQuote(seg))
  }

  const body = req.reqBody
  if (body.kind === 'form') {
    for (const [key, value] of body.pairs) {
      parts.push(singleQuote(`${key}=${maskText(value, opts.mask)}`))
    }
  } else if (body.kind === 'json' || body.kind === 'text') {
    parts.push(`--raw ${singleQuote(maskText(body.raw, opts.mask))}`)
  }

  return parts.join(' ')
}
