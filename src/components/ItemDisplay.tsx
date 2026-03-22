import { Identifier, ItemStack } from 'deepslate'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { getBlockTextureFallbackUrl, getItemTextureFallbackUrl, renderItemImage } from '../services/itemRenderer'
import { humanizeIdentifier } from '../utils'

interface ItemDisplayProps {
  id: string
  count?: number
  showCount?: boolean
  tooltip?: boolean
}

export function ItemDisplay({ id, count = 1, showCount = true, tooltip = true }: ItemDisplayProps) {
  const displayCount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1
  const normalizedId = useMemo(() => normalizeIdentifier(id), [id])
  const stack = useMemo(() => {
    if (!normalizedId) {
      return undefined
    }
    try {
      return new ItemStack(Identifier.parse(normalizedId), displayCount)
    } catch {
      return undefined
    }
  }, [normalizedId, displayCount])

  const [modelSrc, setModelSrc] = useState<string>()
  const [fallbackFailed, setFallbackFailed] = useState(false)
  const [fallbackIndex, setFallbackIndex] = useState(0)

  useEffect(() => {
    setFallbackFailed(false)
    setFallbackIndex(0)
  }, [normalizedId])

  useEffect(() => {
    let cancelled = false
    setModelSrc(undefined)

    if (!stack) {
      return () => {
        cancelled = true
      }
    }

    renderItemImage(stack)
      .then((src) => {
        if (!cancelled) {
          setModelSrc(src)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModelSrc(undefined)
        }
      })

    return () => {
      cancelled = true
    }
  }, [stack?.toString()])

  const fallbackTextures = useMemo(() => {
    const key = normalizedId ?? id
    return [getItemTextureFallbackUrl(key), getBlockTextureFallbackUrl(key)].filter(Boolean) as string[]
  }, [normalizedId, id])

  const label = humanizeIdentifier(id) || 'Air'
  const abbr = label
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()

  const fallbackTexture = fallbackTextures[fallbackIndex]
  const shouldShowFallbackTexture = !modelSrc && fallbackTexture && !fallbackFailed
  const countStyle = getCountStyle(displayCount)

  return (
    <div class="item-display" title={id}>
      {modelSrc && <img src={modelSrc} alt={normalizedId ?? id} class="model" draggable={false} />}
      {shouldShowFallbackTexture && (
        <img
          src={fallbackTexture}
          alt={normalizedId ?? id}
          draggable={false}
          onError={() => {
            setFallbackIndex((current) => {
              if (current + 1 < fallbackTextures.length) {
                return current + 1
              }
              setFallbackFailed(true)
              return current
            })
          }}
        />
      )}
      {!modelSrc && !shouldShowFallbackTexture && (
        <div class="item-display-lite">
          <span class="item-abbr">{abbr || '??'}</span>
        </div>
      )}
      {showCount && displayCount !== 1 && (
        <svg class="item-count" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMinYMid meet">
          <text
            x={countStyle.shadowX}
            y={countStyle.shadowY}
            font-size={countStyle.fontSize}
            text-anchor="end"
            font-family="MinecraftSeven"
            fill="#373737"
          >
            {countStyle.text}
          </text>
          <text
            x={countStyle.mainX}
            y={countStyle.mainY}
            font-size={countStyle.fontSize}
            text-anchor="end"
            font-family="MinecraftSeven"
            fill="#ffffff"
          >
            {countStyle.text}
          </text>
        </svg>
      )}
      {tooltip && (
        <div class="item-tooltip">
          <div class="item-tooltip-title">{label}</div>
          <div class="item-tooltip-sub">{normalizedId ?? id}</div>
          {displayCount !== 1 && <div class="item-tooltip-sub">Count: {displayCount}</div>}
        </div>
      )}
    </div>
  )
}

function normalizeIdentifier(raw: string) {
  const value = raw.startsWith('#') ? raw.slice(1) : raw
  if (!value) {
    return undefined
  }
  const id = value.includes(':') ? value : `minecraft:${value}`
  try {
    return Identifier.parse(id).toString()
  } catch {
    return undefined
  }
}

function getCountStyle(count: number) {
  const text = count > 9999 ? '9999+' : String(count)
  const len = text.length
  if (len <= 2) {
    return { text, fontSize: 50, shadowX: 95, shadowY: 93, mainX: 90, mainY: 88 }
  }
  if (len === 3) {
    return { text, fontSize: 38, shadowX: 97, shadowY: 91, mainX: 93, mainY: 87 }
  }
  return { text, fontSize: 30, shadowX: 98, shadowY: 89, mainX: 95, mainY: 85 }
}
