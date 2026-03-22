import { deepClone, DIALOG_TYPES, getDialogType, normalizeDialog, setDialogType, type DialogType } from '../dialogModel'
import type { Language } from '../i18n'

interface DialogBuilderProps {
  lang: Language
  dialog: any
  onChange: (nextDialog: any) => void
}

type BodyType = 'plain_message' | 'item'
type InputType = 'boolean' | 'number_range' | 'single_option' | 'text'

const BODY_TYPES: BodyType[] = ['plain_message', 'item']
const INPUT_TYPES: InputType[] = ['boolean', 'number_range', 'single_option', 'text']

function tr(lang: Language, zh: string, en: string) {
  return lang === 'zh' ? zh : en
}

export function DialogBuilder({ lang, dialog, onChange }: DialogBuilderProps) {
  const value = normalizeDialog(dialog)
  const type = getDialogType(value)

  const commit = (fn: (draft: any) => void) => {
    const draft = deepClone(value)
    fn(draft)
    onChange(normalizeDialog(draft))
  }

  return (
    <div class="builder-root">
      <h2>{tr(lang,'对话构建器', 'Dialog Builder')}</h2>
      <p class="builder-muted">
        {tr(lang,
          '用于 Minecraft dialog 结构的可视化快速编辑：切换类型、增删条目、重排列表、编辑分组字段。',
          'Fast visual editing for Minecraft dialog structure: switch types, add/remove entries, reorder lists, and edit grouped fields.',
        )}
      </p>

      <section class="builder-section">
        <h3>{tr(lang,'对话', 'Dialog')}</h3>
        <div class="builder-grid">
          <label>
            {tr(lang,'类型', 'Type')}
            <select
              value={type}
              onInput={(event) => {
                const next = (event.currentTarget as HTMLSelectElement).value as DialogType
                onChange(setDialogType(value, next))
              }}
            >
              {DIALOG_TYPES.map((entry) => (
                <option value={entry}>{entry}</option>
              ))}
            </select>
          </label>
          <label>
            {tr(lang,'标题', 'Title')}
            <input
              value={textOf(value.title)}
              onInput={(event) => {
                const text = (event.currentTarget as HTMLInputElement).value
                commit((draft) => {
                  draft.title = makeText(text, colorOf(draft.title))
                })
              }}
            />
          </label>
          <label>
            {tr(lang,'标题颜色', 'Title color')}
            <input
              value={colorOf(value.title)}
              onInput={(event) => {
                const color = (event.currentTarget as HTMLInputElement).value
                commit((draft) => {
                  draft.title = makeText(textOf(draft.title), color)
                })
              }}
            />
          </label>
        </div>
      </section>

      <section class="builder-section">
        <div class="builder-section-head">
          <h3>{tr(lang,'正文', 'Body')}</h3>
          <div class="builder-list-actions">
            <button class="btn small" type="button" onClick={() => commit((draft) => draft.body.push(defaultBody(lang, 'plain_message')))}>+ {tr(lang,'消息', 'message')}</button>
            <button class="btn small" type="button" onClick={() => commit((draft) => draft.body.push(defaultBody(lang, 'item')))}>+ {tr(lang,'物品', 'item')}</button>
          </div>
        </div>
        {(value.body as any[]).length === 0 && <p class="builder-empty">{tr(lang,'暂无正文条目。', 'No body entries.')}</p>}
        {(value.body as any[]).map((entry, index) => {
          const bodyType = bodyTypeOf(entry)
          return (
            <div class="builder-card" key={`body-${index}`}>
              <div class="builder-card-head">
                <strong>{tr(lang,'正文', 'Body')} #{index + 1}</strong>
                <div class="builder-card-actions">
                  <button class="btn small" type="button" disabled={index === 0} onClick={() => commit((draft) => move(draft.body, index, -1))}>↑</button>
                  <button class="btn small" type="button" disabled={index === value.body.length - 1} onClick={() => commit((draft) => move(draft.body, index, 1))}>↓</button>
                  <button class="btn small danger" type="button" onClick={() => commit((draft) => draft.body.splice(index, 1))}>{tr(lang,'删除', 'Delete')}</button>
                </div>
              </div>
              <div class="builder-grid">
                <label>
                  {tr(lang,'类型', 'Type')}
                  <select
                    value={bodyType}
                    onInput={(event) => {
                      const next = (event.currentTarget as HTMLSelectElement).value as BodyType
                      commit((draft) => {
                        draft.body[index] = defaultBody(lang, next)
                      })
                    }}
                  >
                    {BODY_TYPES.map((entry) => (
                      <option value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
                {bodyType === 'plain_message' && (
                  <>
                    <label>
                      {tr(lang,'宽度', 'Width')}
                      <input
                        type="number"
                        value={num(entry.width, 200)}
                        onInput={(event) => {
                          const next = parseNum((event.currentTarget as HTMLInputElement).value, 200)
                          commit((draft) => {
                            draft.body[index].width = next
                          })
                        }}
                      />
                    </label>
                    <label>
                      {tr(lang,'内容', 'Contents')}
                      <input
                        value={textOf(entry.contents)}
                        onInput={(event) => {
                          const next = (event.currentTarget as HTMLInputElement).value
                          commit((draft) => {
                            draft.body[index].contents = makeText(next, colorOf(draft.body[index].contents))
                          })
                        }}
                      />
                    </label>
                  </>
                )}
                {bodyType === 'item' && (
                  <>
                    <label>
                      {tr(lang,'物品 ID', 'Item id')}
                      <input
                        value={typeof entry.item?.id === 'string' ? entry.item.id : 'minecraft:stone'}
                        onInput={(event) => {
                          const next = (event.currentTarget as HTMLInputElement).value
                          commit((draft) => {
                            draft.body[index].item = draft.body[index].item ?? {}
                            draft.body[index].item.id = next
                          })
                        }}
                      />
                    </label>
                    <label>
                      {tr(lang,'数量', 'Count')}
                      <input
                        type="number"
                        value={num(entry.item?.count, 1)}
                        onInput={(event) => {
                          const next = parseNum((event.currentTarget as HTMLInputElement).value, 1)
                          commit((draft) => {
                            draft.body[index].item = draft.body[index].item ?? {}
                            draft.body[index].item.count = next
                          })
                        }}
                      />
                    </label>
                    <label class="builder-check">
                      <input
                        type="checkbox"
                        checked={entry.show_tooltip !== false}
                        onInput={(event) => {
                          const checked = (event.currentTarget as HTMLInputElement).checked
                          commit((draft) => {
                            draft.body[index].show_tooltip = checked
                          })
                        }}
                      />
                      {tr(lang,'显示悬浮提示', 'Show tooltip')}
                    </label>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </section>

      <section class="builder-section">
        <div class="builder-section-head">
          <h3>{tr(lang,'输入项', 'Inputs')}</h3>
          <div class="builder-list-actions">
            {INPUT_TYPES.map((entry) => (
              <button key={entry} class="btn small" type="button" onClick={() => commit((draft) => draft.inputs.push(defaultInput(lang, entry)))}>+ {tr(lang,'添加', 'Add')} {entry}</button>
            ))}
          </div>
        </div>
        {(value.inputs as any[]).length === 0 && <p class="builder-empty">{tr(lang,'暂无输入项。', 'No input entries.')}</p>}
        {(value.inputs as any[]).map((entry, index) => {
          const inputType = inputTypeOf(entry)
          return (
            <div class="builder-card" key={`input-${index}`}>
              <div class="builder-card-head">
                <strong>{tr(lang,'输入项', 'Input')} #{index + 1}</strong>
                <div class="builder-card-actions">
                  <button class="btn small" type="button" disabled={index === 0} onClick={() => commit((draft) => move(draft.inputs, index, -1))}>↑</button>
                  <button class="btn small" type="button" disabled={index === value.inputs.length - 1} onClick={() => commit((draft) => move(draft.inputs, index, 1))}>↓</button>
                  <button class="btn small danger" type="button" onClick={() => commit((draft) => draft.inputs.splice(index, 1))}>{tr(lang,'删除', 'Delete')}</button>
                </div>
              </div>
              <div class="builder-grid">
                <label>
                  {tr(lang,'类型', 'Type')}
                  <select
                    value={inputType}
                    onInput={(event) => {
                      const next = (event.currentTarget as HTMLSelectElement).value as InputType
                      commit((draft) => {
                        draft.inputs[index] = defaultInput(lang, next)
                      })
                    }}
                  >
                    {INPUT_TYPES.map((entry) => (
                      <option value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {tr(lang,'标签', 'Label')}
                  <input
                    value={textOf(entry.label)}
                    onInput={(event) => {
                      const next = (event.currentTarget as HTMLInputElement).value
                      commit((draft) => {
                        draft.inputs[index].label = makeText(next, colorOf(draft.inputs[index].label))
                      })
                    }}
                  />
                </label>
                <label class="builder-check">
                  <input
                    type="checkbox"
                    checked={entry.label_visible !== false}
                    onInput={(event) => {
                      const checked = (event.currentTarget as HTMLInputElement).checked
                      commit((draft) => {
                        draft.inputs[index].label_visible = checked
                      })
                    }}
                  />
                  {tr(lang,'显示标签', 'Label visible')}
                </label>
                {inputType === 'boolean' && (
                  <label class="builder-check">
                    <input
                      type="checkbox"
                      checked={Boolean(entry.initial)}
                      onInput={(event) => {
                        const checked = (event.currentTarget as HTMLInputElement).checked
                        commit((draft) => {
                          draft.inputs[index].initial = checked
                        })
                      }}
                    />
                    {tr(lang,'默认选中', 'Initial true')}
                  </label>
                )}
                {inputType === 'number_range' && (
                  <>
                    <label>
                      {tr(lang,'起始值', 'Start')}
                      <input type="number" value={num(entry.start, 0)} onInput={(event) => commit((draft) => (draft.inputs[index].start = parseNum((event.currentTarget as HTMLInputElement).value, 0)))} />
                    </label>
                    <label>
                      {tr(lang,'结束值', 'End')}
                      <input type="number" value={num(entry.end, 100)} onInput={(event) => commit((draft) => (draft.inputs[index].end = parseNum((event.currentTarget as HTMLInputElement).value, 100)))} />
                    </label>
                    <label>
                      {tr(lang,'初始值', 'Initial')}
                      <input type="number" value={num(entry.initial, 50)} onInput={(event) => commit((draft) => (draft.inputs[index].initial = parseNum((event.currentTarget as HTMLInputElement).value, 50)))} />
                    </label>
                  </>
                )}
                {inputType === 'single_option' && (
                  <label>
                    {tr(lang,'选项（逗号分隔）', 'Options (comma)')}
                    <input
                      value={Array.isArray(entry.options) ? entry.options.map((e: any) => (typeof e === 'string' ? e : (e?.id ?? ''))).join(',') : ''}
                      onInput={(event) => {
                        const text = (event.currentTarget as HTMLInputElement).value
                        commit((draft) => {
                          draft.inputs[index].options = text
                            .split(',')
                            .map((v: string) => v.trim())
                            .filter((v: string) => v.length > 0)
                        })
                      }}
                    />
                  </label>
                )}
                {inputType === 'text' && (
                  <>
                    <label>
                      {tr(lang,'初始文本', 'Initial text')}
                      <input value={typeof entry.initial === 'string' ? entry.initial : ''} onInput={(event) => commit((draft) => (draft.inputs[index].initial = (event.currentTarget as HTMLInputElement).value))} />
                    </label>
                    <label class="builder-check">
                      <input
                        type="checkbox"
                        checked={Boolean(entry.multiline)}
                        onInput={(event) => {
                          const checked = (event.currentTarget as HTMLInputElement).checked
                          commit((draft) => {
                            if (checked) {
                              draft.inputs[index].multiline = draft.inputs[index].multiline ?? { max_lines: 4 }
                            } else {
                              delete draft.inputs[index].multiline
                            }
                          })
                        }}
                      />
                      {tr(lang,'多行输入', 'Multiline')}
                    </label>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </section>

      {type === 'notice' && (
        <section class="builder-section">
          <h3>{tr(lang,'提示框动作', 'Notice Action')}</h3>
          <ActionEditor lang={lang} action={value.action} onChange={(next) => commit((draft) => (draft.action = next))} />
        </section>
      )}

      {type === 'confirmation' && (
        <section class="builder-section">
          <h3>{tr(lang,'确认框', 'Confirmation')}</h3>
          <div class="builder-two-col">
            <div>
              <h4>{tr(lang,'是', 'Yes')}</h4>
              <ActionEditor lang={lang} action={value.yes} onChange={(next) => commit((draft) => (draft.yes = next))} />
            </div>
            <div>
              <h4>{tr(lang,'否', 'No')}</h4>
              <ActionEditor lang={lang} action={value.no} onChange={(next) => commit((draft) => (draft.no = next))} />
            </div>
          </div>
        </section>
      )}

      {type === 'multi_action' && (
        <section class="builder-section">
          <div class="builder-section-head">
            <h3>{tr(lang,'多动作', 'Multi Action')}</h3>
            <button class="btn small" type="button" onClick={() => commit((draft) => draft.actions.push(defaultAction(tr(lang,'新动作', 'New action'))))}>+ {tr(lang,'动作', 'action')}</button>
          </div>
          <div class="builder-grid">
            <label>
              {tr(lang,'列数', 'Columns')}
              <input type="number" value={num(value.columns, 2)} onInput={(event) => commit((draft) => (draft.columns = parseNum((event.currentTarget as HTMLInputElement).value, 2)))} />
            </label>
          </div>
          {(value.actions ?? []).map((entry: any, index: number) => (
            <div class="builder-card" key={`action-${index}`}>
              <div class="builder-card-head">
                <strong>{tr(lang,'动作', 'Action')} #{index + 1}</strong>
                <div class="builder-card-actions">
                  <button class="btn small" type="button" disabled={index === 0} onClick={() => commit((draft) => move(draft.actions, index, -1))}>↑</button>
                  <button class="btn small" type="button" disabled={index === value.actions.length - 1} onClick={() => commit((draft) => move(draft.actions, index, 1))}>↓</button>
                  <button class="btn small danger" type="button" onClick={() => commit((draft) => draft.actions.splice(index, 1))}>{tr(lang,'删除', 'Delete')}</button>
                </div>
              </div>
              <ActionEditor lang={lang} action={entry} onChange={(next) => commit((draft) => (draft.actions[index] = next))} />
            </div>
          ))}
          <ExitActionEditor lang={lang} value={value} commit={commit} />
        </section>
      )}

      {type === 'dialog_list' && (
        <section class="builder-section">
          <div class="builder-section-head">
            <h3>{tr(lang,'对话列表', 'Dialog List')}</h3>
            <button class="btn small" type="button" onClick={() => commit((draft) => draft.dialogs.push('minecraft:new_dialog'))}>+ {tr(lang,'对话', 'dialog')}</button>
          </div>
          <div class="builder-grid">
            <label>
              {tr(lang,'列数', 'Columns')}
              <input type="number" value={num(value.columns, 2)} onInput={(event) => commit((draft) => (draft.columns = parseNum((event.currentTarget as HTMLInputElement).value, 2)))} />
            </label>
            <label>
              {tr(lang,'按钮宽度', 'Button width')}
              <input type="number" value={num(value.button_width, 150)} onInput={(event) => commit((draft) => (draft.button_width = parseNum((event.currentTarget as HTMLInputElement).value, 150)))} />
            </label>
          </div>
          {(value.dialogs ?? []).map((entry: any, index: number) => (
            <div class="builder-subitem" key={`dialog-${index}`}>
              <label>
                {tr(lang,'对话 ID', 'Dialog id')}
                <input value={typeof entry === 'string' ? entry : 'minecraft:new_dialog'} onInput={(event) => commit((draft) => (draft.dialogs[index] = (event.currentTarget as HTMLInputElement).value))} />
              </label>
              <button class="btn small" type="button" disabled={index === 0} onClick={() => commit((draft) => move(draft.dialogs, index, -1))}>↑</button>
              <button class="btn small" type="button" disabled={index === value.dialogs.length - 1} onClick={() => commit((draft) => move(draft.dialogs, index, 1))}>↓</button>
              <button class="btn small danger" type="button" onClick={() => commit((draft) => draft.dialogs.splice(index, 1))}>{tr(lang,'删除', 'Delete')}</button>
            </div>
          ))}
          <ExitActionEditor lang={lang} value={value} commit={commit} />
        </section>
      )}

      {type === 'server_links' && (
        <section class="builder-section">
          <h3>{tr(lang,'服务器链接', 'Server Links')}</h3>
          <div class="builder-grid">
            <label>
              {tr(lang,'列数', 'Columns')}
              <input type="number" value={num(value.columns, 2)} onInput={(event) => commit((draft) => (draft.columns = parseNum((event.currentTarget as HTMLInputElement).value, 2)))} />
            </label>
            <label>
              {tr(lang,'按钮宽度', 'Button width')}
              <input type="number" value={num(value.button_width, 150)} onInput={(event) => commit((draft) => (draft.button_width = parseNum((event.currentTarget as HTMLInputElement).value, 150)))} />
            </label>
          </div>
          <ExitActionEditor lang={lang} value={value} commit={commit} />
        </section>
      )}
    </div>
  )
}

function ExitActionEditor({ lang, value, commit }: { lang: Language; value: any; commit: (fn: (draft: any) => void) => void }) {
  return (
    <div class="builder-exit">
      <label class="builder-check">
        <input
          type="checkbox"
          checked={Boolean(value.exit_action)}
          onInput={(event) => {
            const checked = (event.currentTarget as HTMLInputElement).checked
            commit((draft) => {
              if (checked) {
                draft.exit_action = draft.exit_action ?? defaultAction(tr(lang,'返回', 'Back'))
              } else {
                delete draft.exit_action
              }
            })
          }}
        />
        {tr(lang,'启用 exit_action', 'Enable exit_action')}
      </label>
      {value.exit_action && <ActionEditor lang={lang} action={value.exit_action} onChange={(next) => commit((draft) => (draft.exit_action = next))} />}
    </div>
  )
}

function ActionEditor({ lang, action, onChange }: { lang: Language; action: any; onChange: (next: any) => void }) {
  const value = action ?? defaultAction(tr(lang,'动作', 'Action'))
  return (
    <div class="builder-grid">
      <label>
        {tr(lang,'标签', 'Label')}
        <input value={textOf(value.label)} onInput={(event) => onChange({ ...value, label: makeText((event.currentTarget as HTMLInputElement).value, colorOf(value.label)) })} />
      </label>
      <label>
        {tr(lang,'宽度', 'Width')}
        <input type="number" value={num(value.width, 150)} onInput={(event) => onChange({ ...value, width: parseNum((event.currentTarget as HTMLInputElement).value, 150) })} />
      </label>
      <label>
        {tr(lang,'提示文本', 'Tooltip')}
        <input
          value={textOf(value.tooltip)}
          onInput={(event) => {
            const text = (event.currentTarget as HTMLInputElement).value
            onChange({ ...value, tooltip: text.length > 0 ? makeText(text, colorOf(value.tooltip)) : undefined })
          }}
        />
      </label>
    </div>
  )
}

function defaultBody(lang: Language, type: BodyType): any {
  return type === 'item'
    ? { type: 'minecraft:item', item: { id: 'minecraft:stone', count: 1 }, show_tooltip: true }
    : { type: 'minecraft:plain_message', width: 200, contents: makeText(tr(lang,'新消息', 'New message')) }
}

function defaultInput(lang: Language, type: InputType): any {
  if (type === 'boolean') return { type: 'minecraft:boolean', label: makeText(tr(lang,'开关选项', 'Toggle option')), initial: false }
  if (type === 'number_range') return { type: 'minecraft:number_range', label: makeText(tr(lang,'数值', 'Value')), start: 0, end: 100, initial: 50 }
  if (type === 'single_option') return { type: 'minecraft:single_option', label: makeText(tr(lang,'选择项', 'Select option')), options: ['option_1', 'option_2'] }
  return { type: 'minecraft:text', label: makeText(tr(lang,'文本输入', 'Text input')), initial: '' }
}

function defaultAction(label: string): any {
  return { label: makeText(label), width: 150 }
}

function bodyTypeOf(entry: any): BodyType {
  return normalizeType(entry?.type) === 'item' ? 'item' : 'plain_message'
}

function inputTypeOf(entry: any): InputType {
  const found = INPUT_TYPES.find((value) => value === normalizeType(entry?.type))
  return found ?? 'boolean'
}

function normalizeType(value: unknown): string {
  return typeof value === 'string' ? value.replace(/^minecraft:/, '') : ''
}

function move<T>(list: T[], index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= list.length) return
  const next = [...list]
  const item = next.splice(index, 1)
  next.splice(target, 0, ...item)
  list.splice(0, list.length, ...next)
}

function textOf(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return `${value}`
  if (value && typeof value === 'object' && (typeof (value as any).text === 'string' || typeof (value as any).text === 'number')) return `${(value as any).text}`
  return ''
}

function colorOf(value: unknown): string {
  if (value && typeof value === 'object' && typeof (value as any).color === 'string') return (value as any).color
  return ''
}

function makeText(text: string, color?: string): any {
  const c = (color ?? '').trim()
  return c.length > 0 ? { text, color: c } : { text }
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseNum(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
