export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

export function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export function parseIdentifierPath(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  const content = value.startsWith('#') ? value.slice(1) : value
  const split = content.split(':', 2)
  return split.length === 2 ? split[1] : split[0]
}

export function humanizeIdentifier(value: unknown): string {
  const path = parseIdentifierPath(value)
  const text = path.replaceAll('/', ' ').replaceAll('_', ' ').trim()
  if (text.length === 0) {
    return ''
  }
  return text.charAt(0).toUpperCase() + text.slice(1)
}
