import { useMemo } from 'preact/hooks'

interface TextStyle {
  color?: string
  bold?: boolean
  italic?: boolean
  underlined?: boolean
  strikethrough?: boolean
}

interface TextPartData extends TextStyle {
  text?: string
  translate?: string
  fallback?: string
  with?: unknown[]
}

interface TextComponentProps {
  component: unknown
  base?: TextStyle
  oneline?: boolean
}

const TRANSLATIONS: Record<string, string> = {
  'gui.ok': 'OK',
  'gui.yes': 'Yes',
  'gui.no': 'No',
  'options.generic_value': '%s: %s',
}

const TEXT_COLORS: Record<string, [string, string]> = {
  black: ['#000', '#000'],
  dark_blue: ['#00A', '#00002A'],
  dark_green: ['#0A0', '#002A00'],
  dark_aqua: ['#0AA', '#002A2A'],
  dark_red: ['#A00', '#2A0000'],
  dark_purple: ['#A0A', '#2A002A'],
  gold: ['#FA0', '#2A2A00'],
  gray: ['#AAA', '#2A2A2A'],
  dark_gray: ['#555', '#151515'],
  blue: ['#55F', '#15153F'],
  green: ['#5F5', '#153F15'],
  aqua: ['#5FF', '#153F3F'],
  red: ['#F55', '#3F1515'],
  light_purple: ['#F5F', '#3F153F'],
  yellow: ['#FF5', '#3F3F15'],
  white: ['#FFF', '#3F3F3F'],
}

export function TextComponent({ component, base = { color: 'white' }, oneline }: TextComponentProps) {
  const state = JSON.stringify(component)
  const parts = useMemo(() => {
    const output: TextPartData[] = []
    visitComponent(component, (part) => output.push(inheritStyle(part, base)))
    return output
  }, [state, base])

  return (
    <div class="text-component">
      {parts.map((part, index) => {
        let text = part.translate
          ? resolveTranslate(part.translate, part.fallback, part.with)
          : (part.text ?? '')

        if (oneline) {
          text = text.replaceAll('\n', ' ')
        }

        return (
          <span key={index} style={createStyle(part)}>
            {text}
          </span>
        )
      })}
    </div>
  )
}

function visitComponent(component: unknown, consumer: (part: TextPartData) => void) {
  if (typeof component === 'string' || typeof component === 'number') {
    consumer({ text: component.toString() })
    return
  }

  if (Array.isArray(component)) {
    const base = component[0] ?? {}
    visitComponent(base, consumer)
    for (const entry of component.slice(1)) {
      visitComponent(entry, (data) => consumer(inheritStyle(data, base as TextPartData)))
    }
    return
  }

  if (typeof component !== 'object' || component === null) {
    return
  }

  const obj = component as Record<string, unknown>

  if (typeof obj.text === 'string' || typeof obj.text === 'number') {
    consumer(obj as TextPartData)
  } else if (typeof obj.translate === 'string') {
    consumer(obj as TextPartData)
  } else if (obj.selector) {
    consumer({ ...(obj as TextPartData), text: 'Steve' })
  } else if (obj.score) {
    consumer({ ...(obj as TextPartData), text: '123' })
  } else if (typeof obj.keybind === 'string') {
    consumer({ ...(obj as TextPartData), text: obj.keybind })
  } else if (typeof obj.nbt === 'string') {
    consumer({ ...(obj as TextPartData), text: obj.nbt })
  }

  const extra = obj.extra
  if (Array.isArray(extra)) {
    for (const entry of extra) {
      visitComponent(entry, (part) => consumer(inheritStyle(part, obj as TextPartData)))
    }
  }
}

function inheritStyle(part: TextPartData, base: TextPartData): TextPartData {
  return {
    ...part,
    color: part.color ?? base.color,
    bold: part.bold ?? base.bold,
    italic: part.italic ?? base.italic,
    underlined: part.underlined ?? base.underlined,
    strikethrough: part.strikethrough ?? base.strikethrough,
  }
}

function resolveTranslate(translate: string, fallback: string | undefined, withArgs: unknown[] | undefined): string {
  const template = TRANSLATIONS[translate] ?? fallback ?? translate
  const values = (withArgs ?? []).map((item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      return `${item}`
    }

    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>
      if (typeof obj.text === 'string' || typeof obj.text === 'number') {
        return `${obj.text}`
      }
      if (typeof obj.translate === 'string') {
        return resolveTranslate(obj.translate, typeof obj.fallback === 'string' ? obj.fallback : undefined, Array.isArray(obj.with) ? obj.with : undefined)
      }
    }

    return ''
  })

  return formatTemplate(template, values)
}

function formatTemplate(template: string, values: string[]): string {
  let sequential = 0
  return template
    .replace(/%(\d+)\$s/g, (_match, rawIndex: string) => {
      const index = Number(rawIndex) - 1
      return values[index] ?? ''
    })
    .replace(/%s/g, () => {
      const value = values[sequential] ?? ''
      sequential += 1
      return value
    })
}

function createStyle(style: TextStyle): Record<string, string | undefined> {
  return {
    color: style.color ? (TEXT_COLORS[style.color]?.[0] ?? style.color) : undefined,
    '--shadow-color': style.color ? TEXT_COLORS[style.color]?.[1] : undefined,
    fontWeight: style.bold ? 'bold' : undefined,
    fontStyle: style.italic ? 'italic' : undefined,
    textDecoration: style.underlined
      ? (style.strikethrough ? 'underline line-through' : 'underline')
      : (style.strikethrough ? 'line-through' : undefined),
  }
}
