import { useEffect, useMemo, useState } from 'preact/hooks'
import { DialogBuilder } from './components/DialogBuilder'
import { DialogPreview } from './components/DialogPreview'
import { createTemplate, DIALOG_TYPES, getDialogType, normalizeDialog, stringifyDialog, type DialogType } from './dialogModel'
import { getInitialLanguage, isLanguage, LANGUAGE_STORAGE_KEY, type Language } from './i18n'
import { SchemaEditorPanel } from './schema/SchemaEditorPanel'
import { safeJsonParse } from './utils'

const DEFAULT_TEMPLATE: DialogType = 'notice'

const APP_COPY = {
  zh: {
    pageTitle: 'Minecraft 对话生成器',
    appTitle: 'Minecraft 对话生成器',
    subtitle: '适用于 Java 版 Dialog JSON（1.21.6+）的 Schema 驱动编辑器。',
    basedOn: '基于原项目：',
    formatJson: '格式化 JSON',
    jsonToBuilder: 'JSON 同步到构建器',
    download: '下载',
    jsonSource: '对话 JSON 源码',
    jsonError: 'JSON 错误',
    preview: '游戏内预览',
    previewExpand: '展开预览',
    previewCollapse: '收起预览',
    previewRefresh: '刷新预览',
    invalidJson: 'JSON 无效',
    language: '语言',
    languageZh: '简体中文',
    languageEn: 'English',
  },
  en: {
    pageTitle: 'Minecraft Dialog Generator',
    appTitle: 'Minecraft Dialog Generator',
    subtitle: 'Schema-driven editor for Java Edition dialog JSON (1.21.6+).',
    basedOn: 'Based on the original project:',
    formatJson: 'Format JSON',
    jsonToBuilder: 'JSON to Builder',
    download: 'Download',
    jsonSource: 'Dialog JSON Source',
    jsonError: 'JSON error',
    preview: 'In-Game Preview',
    previewExpand: 'Expand Preview',
    previewCollapse: 'Collapse Preview',
    previewRefresh: 'Refresh Preview',
    invalidJson: 'Invalid JSON',
    language: 'Language',
    languageZh: '简体中文',
    languageEn: 'English',
  },
} as const

export function App() {
  const [lang, setLang] = useState<Language>(() => getInitialLanguage())
  const [builderDialog, setBuilderDialog] = useState<any>(() => createTemplate(DEFAULT_TEMPLATE))
  const [jsonText, setJsonText] = useState(() => stringifyDialog(createTemplate(DEFAULT_TEMPLATE)))
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0)
  const copy = APP_COPY[lang]

  const parseResult = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText)
      return { parsed, error: '' }
    } catch (error) {
      return { parsed: undefined, error: error instanceof Error ? error.message : copy.invalidJson }
    }
  }, [jsonText, copy.invalidJson])

  const selectedTemplate = useMemo(() => {
    const parsed = safeJsonParse(jsonText)
    return getDialogType(parsed)
  }, [jsonText])

  useEffect(() => {
    if (parseResult.parsed !== undefined) {
      setBuilderDialog(normalizeDialog(parseResult.parsed))
    }
  }, [parseResult.parsed])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
      document.title = copy.pageTitle
    }
  }, [lang, copy.pageTitle])

  useEffect(() => {
    if (!previewExpanded) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewExpanded(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewExpanded])

  const formatJson = () => {
    if (parseResult.parsed !== undefined) {
      setJsonText(stringifyDialog(parseResult.parsed))
    }
  }

  const downloadJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'dialog.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const loadJsonToBuilder = () => {
    if (parseResult.parsed !== undefined) {
      setBuilderDialog(normalizeDialog(parseResult.parsed))
    }
  }

  const applyTemplate = (type: DialogType) => {
    const template = createTemplate(type)
    setBuilderDialog(template)
    setJsonText(stringifyDialog(template))
  }

  const onBuilderChange = (nextDialog: any) => {
    setBuilderDialog(nextDialog)
    setJsonText(stringifyDialog(nextDialog))
  }

  return (
    <div class="app-shell">
      <header class="app-header">
        <h1>{copy.appTitle}</h1>
        <p>
          {copy.subtitle}
          <br />
          {copy.basedOn}{' '}
          <a href="https://github.com/misode/misode.github.io" target="_blank" rel="noreferrer">
            misode/misode.github.io
          </a>
        </p>
      </header>

      <div class="toolbar">
        <div class="template-group">
          {DIALOG_TYPES.map((type) => (
            <button key={type} type="button" class={`btn ${selectedTemplate === type ? 'active' : ''}`} onClick={() => applyTemplate(type)}>
              {type}
            </button>
          ))}
        </div>
        <div class="action-group">
          <button type="button" class="btn" onClick={formatJson} disabled={Boolean(parseResult.error)}>
            {copy.formatJson}
          </button>
          <button type="button" class="btn" onClick={loadJsonToBuilder} disabled={Boolean(parseResult.error)}>
            {copy.jsonToBuilder}
          </button>
          <button type="button" class="btn" onClick={downloadJson}>
            {copy.download}
          </button>
          <div class="lang-group">
            <label htmlFor="ui-language">{copy.language}</label>
            <select
              id="ui-language"
              class="lang-select"
              value={lang}
              onInput={(event) => {
                const next = (event.currentTarget as HTMLSelectElement).value
                if (isLanguage(next)) {
                  setLang(next)
                }
              }}
            >
              <option value="zh">{copy.languageZh}</option>
              <option value="en">{copy.languageEn}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="workspace">
        <section class="builder-panel">
          <DialogBuilder lang={lang} dialog={builderDialog} onChange={onBuilderChange} />
        </section>

        <section class="schema-panel">
          <SchemaEditorPanel lang={lang} text={jsonText} onChange={setJsonText} />
        </section>

        <section class="editor-panel">
          <label htmlFor="dialog-json">{copy.jsonSource}</label>
          <textarea
            id="dialog-json"
            spellcheck={false}
            value={jsonText}
            onInput={(event) => setJsonText((event.currentTarget as HTMLTextAreaElement).value)}
          ></textarea>
          {parseResult.error && <p class="parse-error">{copy.jsonError}: {parseResult.error}</p>}
        </section>

        <section class={`preview-panel ${previewExpanded ? 'preview-panel-expanded' : ''}`}>
          <div class="preview-panel-head">
            <h2>{copy.preview}</h2>
            <div class="preview-actions">
              <button type="button" class="btn small" onClick={() => setPreviewRefreshToken((value) => value + 1)}>
                {copy.previewRefresh}
              </button>
              <button type="button" class={`btn small ${previewExpanded ? 'active' : ''}`} onClick={() => setPreviewExpanded((value) => !value)}>
                {previewExpanded ? copy.previewCollapse : copy.previewExpand}
              </button>
            </div>
          </div>
          <div class={`preview-stage ${previewExpanded ? 'expanded' : ''}`}>
            <DialogPreview key={`preview-${previewRefreshToken}-${previewExpanded ? 'expanded' : 'normal'}`} lang={lang} text={jsonText} />
          </div>
        </section>
      </div>
    </div>
  )
}
