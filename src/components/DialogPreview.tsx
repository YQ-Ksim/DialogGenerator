import type { ComponentChild, ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { Language } from '../i18n'
import { clamp, humanizeIdentifier, parseIdentifierPath, safeJsonParse } from '../utils'
import { ItemDisplay } from './ItemDisplay'
import { TextComponent } from './TextComponent'

interface DialogPreviewProps {
  lang: Language
  text: string
}

export function DialogPreview({ lang, text }: DialogPreviewProps) {
  const overlay = useRef<HTMLDivElement>(null)

  const dialog = safeJsonParse(text) ?? {}
  const type = normalizeType(dialog.type)
  const footerHeight =
    (type === 'dialog_list' || type === 'multi_action' || type === 'server_links') && dialog.exit_action === undefined
      ? 5
      : 33

  useEffect(() => {
    function resizeHandler() {
      if (!overlay.current) {
        return
      }
      const width = Math.floor(overlay.current.clientWidth)
      overlay.current.style.setProperty('--dialog-px', `${width / 400}px`)
    }

    resizeHandler()
    window.addEventListener('resize', resizeHandler)
    return () => window.removeEventListener('resize', resizeHandler)
  }, [])

  return (
    <div ref={overlay} class="preview-overlay dialog-preview" style="--dialog-px: 1px;">
      <img src="/images/dialog/background.webp" alt="" draggable={false} />
      <div style="top: 0; left: 0; width: 100%; height: 100%;">
        <DialogTitle lang={lang} title={dialog.title} />
        <div
          style={`display: flex; flex-direction: column; gap: ${px(10)}; align-items: center; overflow-y: auto; height: calc(100% - ${px(
            33 + footerHeight,
          )})`}
        >
          <DialogBody body={dialog.body} />
          <DialogInputs inputs={dialog.inputs} />
          <DialogActions lang={lang} dialog={dialog} />
        </div>
        <div
          style={`bottom: 0; left: 0; width: 100%; height: ${px(
            footerHeight,
          )}; display: flex; justify-content: center; align-items: center;`}
        >
          <DialogFooter dialog={dialog} />
        </div>
      </div>
    </div>
  )
}

function DialogTitle({ lang, title }: { lang: Language; title: unknown }) {
  return (
    <div style={`height: ${px(33)}; display: flex; gap: ${px(10)}; justify-content: center; align-items: center`}>
      <TextComponent component={title} />
      <WithTooltip tooltip={tr(lang, '这是自定义界面，点击可了解更多。', 'This is a custom screen. Click here to learn more.')}>
        <div class="dialog-warning-button" style={`width: ${px(20)}; height: ${px(20)};`}></div>
      </WithTooltip>
    </div>
  )
}

function DialogBody({ body }: { body: unknown }) {
  let parts: any[]
  if (!body) {
    parts = []
  } else if (Array.isArray(body)) {
    parts = body
  } else {
    parts = [body]
  }

  return (
    <>
      {parts.map((entry, index) => {
        const type = normalizeType(entry?.type)

        if (type === 'plain_message') {
          return (
            <div
              key={index}
              class="dialog-body"
              style={`max-width: ${px(clamp(entry.width ?? 200, 1, 1024))}; padding: ${px(4)}`}
            >
              <TextComponent component={entry.contents} />
            </div>
          )
        }

        if (type === 'item') {
          const itemId = typeof entry.item?.id === 'string' ? entry.item.id : 'minecraft:air'
          const showCount = entry.show_decorations !== false
          const count = Number(entry.item?.count ?? 1)
          const safeCount = Number.isFinite(count) ? count : 1

          return (
            <div key={index} style={`display: flex; align-items: center; gap: ${px(4)};`}>
              <div
                style={`display: flex; justify-content: center; align-items: center; width: ${px(
                  clamp(entry.width ?? 16, 1, 256),
                )}; height: ${px(clamp(entry.height ?? 16, 1, 256))};`}
              >
                <ItemDisplay id={itemId} count={safeCount} showCount={showCount} tooltip={entry.show_tooltip !== false} />
              </div>
              {entry.description && (
                <div style={`max-width: ${px(clamp(entry.description.width ?? 200, 1, 1024))};`}>
                  <TextComponent component={entry.description.contents} />
                </div>
              )}
            </div>
          )
        }

        return <></>
      })}
    </>
  )
}

function DialogInputs({ inputs }: { inputs: unknown }) {
  if (!Array.isArray(inputs)) {
    return <></>
  }

  return (
    <>
      {inputs.map((entry, index) => (
        <InputControl key={index} input={entry} />
      ))}
    </>
  )
}

function DialogActions({ lang, dialog }: { lang: Language; dialog: any }) {
  const type = normalizeType(dialog.type)

  if (type === 'dialog_list') {
    let dialogs: any[] = []

    if (Array.isArray(dialog.dialogs)) {
      dialogs = dialog.dialogs
    } else if (typeof dialog.dialogs === 'string') {
      if (dialog.dialogs.startsWith('#')) {
        dialogs = ['dialog_1', 'dialog_2', 'dialog_3']
      } else {
        dialogs = [dialog.dialogs]
      }
    }

    return (
      <ColumnsGrid columns={dialog.columns ?? 2}>
        {dialogs.map((entry, index) => {
          let text: unknown = ''

          if (typeof entry === 'string') {
            text = humanizeIdentifier(parseIdentifierPath(entry))
          } else {
            text = entry?.external_title ?? entry?.title ?? ''
          }

          return <Button key={index} label={text} width={dialog.button_width ?? 150} />
        })}
      </ColumnsGrid>
    )
  }

  if (type === 'multi_action') {
    return (
      <ColumnsGrid columns={dialog.columns ?? 2}>
        {(dialog.actions ?? []).map((entry: any, index: number) => (
          <Button key={index} label={entry.label} width={entry.width ?? 150} tooltip={entry.tooltip} />
        ))}
      </ColumnsGrid>
    )
  }

  if (type === 'server_links') {
    const links = lang === 'zh' ? ['服务器链接 1', '服务器链接 2', '服务器链接 3'] : ['Server link 1', 'Server link 2', 'Server link 3']
    return (
      <ColumnsGrid columns={dialog.columns ?? 2}>
        {links.map((label, index) => (
          <Button key={index} label={label} width={dialog.button_width ?? 150} />
        ))}
      </ColumnsGrid>
    )
  }

  return <></>
}

function DialogFooter({ dialog }: { dialog: any }) {
  const type = normalizeType(dialog.type)

  if (type === 'confirmation') {
    return (
      <div style={`display: flex; gap: ${px(8)}; justify-content: center;`}>
        <Button label={dialog.yes?.label} width={dialog.yes?.width ?? 150} tooltip={dialog.yes?.tooltip} />
        <Button label={dialog.no?.label} width={dialog.no?.width ?? 150} tooltip={dialog.no?.tooltip} />
      </div>
    )
  }

  if ((type === 'dialog_list' || type === 'multi_action' || type === 'server_links') && dialog.exit_action) {
    return <Button label={dialog.exit_action.label} width={200} />
  }

  if (type === 'notice') {
    return (
      <div style={`display: flex; gap: ${px(8)}; justify-content: center;`}>
        <Button
          label={dialog.action?.label ?? { translate: 'gui.ok' }}
          width={dialog.action?.width ?? 150}
          tooltip={dialog.action?.tooltip}
        />
      </div>
    )
  }

  return <></>
}

function InputControl({ input }: { input: any }) {
  const type = normalizeType(input.type)

  if (type === 'boolean') {
    return (
      <div style={`display: flex; gap: ${px(4)}; align-items: center;`}>
        <div class={`dialog-checkbox ${input.initial ? 'dialog-selected' : ''}`} style={`width: ${px(17)}; height: ${px(17)}`}></div>
        <TextComponent component={input.label} base={{ color: '#e0e0e0' }} />
      </div>
    )
  }

  if (type === 'number_range') {
    const initial = input.initial ?? ((input.start ?? 0) + (input.end ?? 0)) / 2
    const label = {
      translate: input.label_format ?? 'options.generic_value',
      with: [input.label ?? '', initial],
    }

    return (
      <div class="dialog-slider" style={`width: ${px(clamp(input.width ?? 200, 1, 1024))}; height: ${px(20)};`}>
        <div class="dialog-slider-track"></div>
        <div class="dialog-slider-handle"></div>
        <div class="dialog-slider-text">
          <TextComponent component={label} />
        </div>
      </div>
    )
  }

  if (type === 'single_option') {
    const initial = input.options?.find((entry: any) => entry.initial) ?? input.options?.[0]
    const initialLabel = typeof initial === 'string' ? initial : initial?.display ?? initial?.id ?? ''
    const label = input.label_visible === false ? initialLabel : { translate: 'options.generic_value', with: [input.label ?? '', initialLabel] }
    return <Button label={label} width={clamp(input.width ?? 200, 1, 1024)} />
  }

  if (type === 'text') {
    const height = input.multiline
      ? input.multiline.height
        ? clamp(input.multiline.height, 1, 512)
        : 9 * Math.max(input.multiline.max_lines ?? 4, 1) + 8
      : 20

    return (
      <div style={`display: flex; flex-direction: column; gap: ${px(4)};`}>
        {input.label_visible !== false && <TextComponent component={input.label} />}
        <div class="dialog-edit-box" style={`width: ${px(clamp(input.width ?? 200, 1, 1024))}; height: ${px(height)};`}>
          {input.initial && <TextComponent component={input.initial} />}
        </div>
      </div>
    )
  }

  return <></>
}

interface ColumnsGridProps {
  columns: number
  children: ComponentChildren
}

function ColumnsGrid({ columns, children }: ColumnsGridProps) {
  const childList = (Array.isArray(children) ? children : [children]).filter(
    (item) => item !== null && item !== undefined && item !== false,
  ) as ComponentChild[]

  const totalCount = childList.length
  const gridCount = Math.floor(totalCount / columns) * columns

  return (
    <div
      style={`padding-top: ${px(4)}; display: grid; grid-template-columns: repeat(${columns}, minmax(0, 1fr)); gap: ${px(
        2,
      )}; justify-content: center;`}
    >
      {childList.slice(0, gridCount)}
      {totalCount > gridCount && (
        <div style={`grid-column: span ${columns}; display: flex; gap: ${px(2)}; justify-content: center;`}>
          {childList.slice(gridCount)}
        </div>
      )}
    </div>
  )
}

interface ButtonProps {
  label: unknown
  width: number
  tooltip?: unknown
}

function Button({ label, width, tooltip }: ButtonProps) {
  return (
    <WithTooltip tooltip={tooltip}>
      <div class="dialog-button" style={`width: ${px(clamp(width, 1, 1024))}; height: ${px(20)};`}>
        <TextComponent component={label} oneline />
      </div>
    </WithTooltip>
  )
}

interface WithTooltipProps {
  tooltip?: unknown
  children: ComponentChildren
}

function WithTooltip({ tooltip, children }: WithTooltipProps) {
  if (!tooltip) {
    return <>{children}</>
  }

  const container = useRef<HTMLDivElement>(null)
  const [tooltipOffset, setTooltipOffset] = useState<[number, number]>([0, 0])

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      requestAnimationFrame(() => {
        setTooltipOffset([event.offsetX + 20, event.offsetY - 10])
      })
    }

    const target = container.current
    target?.addEventListener('mousemove', onMove)

    return () => {
      target?.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <div ref={container} class="tooltip-container">
      {children}
      <div class="dialog-tooltip" style={`left: ${tooltipOffset[0]}px; top: ${tooltipOffset[1]}px;`}>
        <TextComponent component={tooltip} />
      </div>
    </div>
  )
}

function normalizeType(value: unknown) {
  return typeof value === 'string' ? value.replace(/^minecraft:/, '') : ''
}

function px(value: number) {
  return `calc(var(--dialog-px) * ${value})`
}

function tr(lang: Language, zh: string, en: string) {
  return lang === 'zh' ? zh : en
}

