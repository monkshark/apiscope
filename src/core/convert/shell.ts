export interface ConvertOptions {
  mask: boolean
  maskKeys: string[]
  windows?: boolean
  placeholders?: boolean
}

export function singleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

export function doubleQuoteKeepVars(value: string): string {
  return `"${value.replace(/([\\"`])/g, '\\$1')}"`
}
