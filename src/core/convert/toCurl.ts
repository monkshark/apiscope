import type { CapturedRequest } from '../../types'
import { maskHeaderValueStyled, maskUrlStyled, maskText, type MaskStyle } from '../mask'
import { singleQuote, doubleQuoteKeepVars, type ConvertOptions } from './shell'

export function toCurl(req: CapturedRequest, opts: ConvertOptions): string {
  const cont = opts.windows ? ' ^\n  ' : ' \\\n  '
  const style: MaskStyle = opts.placeholders ? 'placeholder-env' : 'redact'
  const lines: string[] = []

  if (!opts.mask) {
    lines.push(`curl ${singleQuote(req.url)}`)
  } else {
    const { url, hasPlaceholder } = maskUrlStyled(req.url, style)
    lines.push(`curl ${hasPlaceholder ? doubleQuoteKeepVars(url) : singleQuote(url)}`)
  }

  const method = req.method.toUpperCase()
  if (method !== 'GET') lines.push(`-X ${method}`)

  for (const [key, raw] of Object.entries(req.reqHeaders)) {
    if (!opts.mask) {
      lines.push(`-H ${singleQuote(`${key}: ${raw}`)}`)
      continue
    }
    const value = maskHeaderValueStyled(key, raw, opts.maskKeys, style)
    const seg = `${key}: ${value}`
    const useVarQuote = opts.placeholders && value.includes('$')
    lines.push(`-H ${useVarQuote ? doubleQuoteKeepVars(seg) : singleQuote(seg)}`)
  }

  const body = req.reqBody
  if (body.kind === 'json' || body.kind === 'text') {
    lines.push(`--data-raw ${singleQuote(maskText(body.raw, opts.mask))}`)
  } else if (body.kind === 'form') {
    for (const [key, value] of body.pairs) {
      lines.push(
        `--data-urlencode ${singleQuote(`${key}=${maskText(value, opts.mask)}`)}`,
      )
    }
  } else if (body.kind === 'multipart') {
    for (const part of body.parts) {
      lines.push(
        part.filename
          ? `-F ${singleQuote(`${part.name}=@${part.filename}`)}`
          : `-F ${singleQuote(`${part.name}=`)}`,
      )
    }
  }

  return lines.join(cont)
}
